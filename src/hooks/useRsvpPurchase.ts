import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RSVP_OVERAGE } from '@/lib/stripePrices';

const getPricingTier = (count: number) => {
  if (count <= 100) return { price: 100, label: '1–100 guests', max: 100 };
  if (count <= 200) return { price: 129, label: '101–200 guests', max: 200 };
  if (count <= 300) return { price: 149, label: '201–300 guests', max: 300 };
  if (count <= 400) return { price: 159, label: '301–400 guests', max: 400 };
  if (count <= 500) return { price: 199, label: '401–500 guests', max: 500 };
  return { price: 299, label: '501–1000 guests', max: 1000 };
};

/**
 * Parse a tier label like "1–100 guests" or "501-1000 guests"
 * and return the upper bound (e.g. 100, 1000). Returns 0 if not parseable.
 */
const getTierMaxFromLabel = (label: string | null | undefined): number => {
  if (!label) return 0;
  const match = label.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (!match) return 0;
  return parseInt(match[2], 10) || 0;
};

export interface RsvpPurchaseRecord {
  id: string;
  amount_paid: number;
  guest_tier_label: string | null;
  created_at: string;
  purchase_type?: string | null;
  purchased_limit?: number | null;
  overage_blocks?: number | null;
}

export const useRsvpPurchase = (eventId: string | null) => {
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchase, setPurchase] = useState<RsvpPurchaseRecord | null>(null);
  const [overagePurchases, setOveragePurchases] = useState<RsvpPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!eventId) {
      setHasPurchased(false);
      setPurchase(null);
      setOveragePurchases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from('rsvp_invite_purchases')
        .select('id, amount_paid, guest_tier_label, created_at, purchase_type, purchased_limit, overage_blocks')
        .eq('event_id', eventId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      const rows = (data || []) as RsvpPurchaseRecord[];
      // Tier purchase = purchase_type 'rsvp_tier' OR null/undefined (legacy)
      const tierRow = rows.find(r => !r.purchase_type || r.purchase_type === 'rsvp_tier') || null;
      const overageRows = rows.filter(r => r.purchase_type === 'rsvp_overage');

      setPurchase(tierRow);
      setHasPurchased(!!tierRow);
      setOveragePurchases(overageRows);
    } catch (err) {
      console.error('Error checking RSVP purchase:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refetch when the window regains focus or tab becomes visible.
  // This ensures the allowance reflects a successful Stripe checkout
  // as soon as the user returns from the payment redirect.
  useEffect(() => {
    if (!eventId) return;
    const onFocus = () => refetch();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [eventId, refetch]);

  // Total guests covered by all overage blocks
  const overageGuests = overagePurchases.reduce(
    (sum, p) => sum + (Number(p.overage_blocks) || 0) * RSVP_OVERAGE.guests_per_block,
    0,
  );

  const tierMax = purchase ? getTierMaxFromLabel(purchase.guest_tier_label) : 0;
  const totalCapacity = tierMax + overageGuests;

  return {
    hasPurchased,
    purchase,
    overagePurchases,
    overageGuests,
    tierMax,
    totalCapacity,
    loading,
    getPricingTier,
    refetch,
  };
};

export { getPricingTier, getTierMaxFromLabel };
