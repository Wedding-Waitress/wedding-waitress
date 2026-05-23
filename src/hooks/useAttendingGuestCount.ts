import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeRsvp } from '@/lib/rsvp';

/**
 * Phase 1A — Step 5
 * Lightweight count of "Attending" guests for an event. Used by the
 * Reception Floor Plan capacity banner.
 */
export const useAttendingGuestCount = (eventId: string | null) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setCount(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('rsvp')
        .eq('event_id', eventId);
      if (cancelled) return;
      if (error) {
        console.error('useAttendingGuestCount', error);
        setCount(0);
      } else {
        const attending = (data || []).filter(
          (g) => normalizeRsvp(g.rsvp) === 'Attending'
        ).length;
        setCount(attending);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { count, loading };
};
