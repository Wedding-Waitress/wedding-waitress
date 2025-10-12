import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EventShortlink {
  id: string;
  event_id: string;
  slug: string;
  target_url: string;
  click_count: number;
  created_at: string;
  updated_at: string;
  last_clicked_at: string | null;
}

/**
 * Hook to fetch and manage event shortlink data
 * @param eventId - UUID of the event
 * @returns Shortlink data, loading state
 */
export const useEventShortlink = (eventId: string | null) => {
  const [shortlink, setShortlink] = useState<EventShortlink | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchShortlink = async () => {
      if (!eventId) {
        setShortlink(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('event_shortlinks')
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching shortlink:', error);
          return;
        }

        setShortlink(data);
      } catch (error) {
        console.error('Unexpected error fetching shortlink:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShortlink();
  }, [eventId]);

  return { shortlink, loading };
};
