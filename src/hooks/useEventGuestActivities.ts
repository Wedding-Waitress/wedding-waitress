/**
 * useEventGuestActivities — lightweight event-wide activity fetch.
 *
 * Read-only summary feed used by Guest Intelligence Centre to derive
 * RSVP behaviour insights (opens without response, recent activity,
 * RSVP changes, follow-up needs). NOT a delivery analytics surface.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GuestActivity } from './useGuestActivities';

export const useEventGuestActivities = (
  eventId: string | null | undefined,
  opts?: { limit?: number; enabled?: boolean }
) => {
  const enabled = opts?.enabled ?? true;
  const limit = opts?.limit ?? 1000;
  const [activities, setActivities] = useState<GuestActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!eventId || !enabled) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('guest_activities')
      .select('id,guest_id,event_id,activity_type,channel,status,occurred_at')
      .eq('event_id', eventId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (!error) setActivities((data ?? []) as GuestActivity[]);
    setLoading(false);
  }, [eventId, enabled, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { activities, loading, refetch: fetch };
};
