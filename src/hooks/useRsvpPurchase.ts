import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const getPricingTier = (count: number) => {
  if (count <= 100) return { price: 99, label: '1–100 guests' };
  if (count <= 200) return { price: 129, label: '101–200 guests' };
  if (count <= 300) return { price: 149, label: '201–300 guests' };
  if (count <= 400) return { price: 159, label: '301–400 guests' };
  if (count <= 500) return { price: 199, label: '401–500 guests' };
  return { price: 299, label: '501–1000 guests' };
};

export const useRsvpPurchase = (eventId: string | null) => {
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!eventId) {
        setHasPurchased(false);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('rsvp_invite_purchases')
          .select('id')
          .eq('event_id', eventId)
          .eq('status', 'completed')
          .limit(1);

        setHasPurchased((data && data.length > 0) || false);
      } catch (err) {
        console.error('Error checking RSVP purchase:', err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [eventId]);

  return { hasPurchased, loading, getPricingTier };
};

export { getPricingTier };
