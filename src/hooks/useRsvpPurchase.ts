import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const getPricingTier = (count: number) => {
  if (count <= 100) return { price: 99, label: '1–100 guests', max: 100 };
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
  // Match digits separated by either em-dash, en-dash or hyphen
  const match = label.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (!match) return 0;
  return parseInt(match[2], 10) || 0;
};

export interface RsvpPurchaseRecord {
  id: string;
  amount_paid: number;
  guest_tier_label: string | null;
  created_at: string;
}

export const useRsvpPurchase = (eventId: string | null) => {
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchase, setPurchase] = useState<RsvpPurchaseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!eventId) {
        setHasPurchased(false);
        setPurchase(null);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('rsvp_invite_purchases')
          .select('id, amount_paid, guest_tier_label, created_at')
          .eq('event_id', eventId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setHasPurchased(true);
          setPurchase(data[0] as RsvpPurchaseRecord);
        } else {
          setHasPurchased(false);
          setPurchase(null);
        }
      } catch (err) {
        console.error('Error checking RSVP purchase:', err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [eventId]);

  return { hasPurchased, purchase, loading, getPricingTier };
};

export { getPricingTier, getTierMaxFromLabel };
