import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SmsCredits {
  total: number;
  used: number;
  remaining: number;
}

const ZERO: SmsCredits = { total: 0, used: 0, remaining: 0 };

/**
 * useSmsCredits — Smart RSVP & Messaging credit balance for (current user, event).
 * Includes realtime sync so balance updates instantly after a top-up or send.
 */
export const useSmsCredits = (eventId: string | null | undefined) => {
  const [credits, setCredits] = useState<SmsCredits>(ZERO);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!eventId) { setCredits(ZERO); return; }
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setCredits(ZERO); return; }

      const { data, error } = await supabase.rpc('get_sms_credits', {
        _user_id: uid,
        _event_id: eventId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setCredits({
        total: Number(row?.total ?? 0),
        used: Number(row?.used ?? 0),
        remaining: Number(row?.remaining ?? 0),
      });
    } catch (err) {
      console.error('[useSmsCredits] fetch failed', err);
      setCredits(ZERO);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  // Realtime: refetch when sms_credits row changes
  useEffect(() => {
    if (!eventId || !userId) return;
    const channel = supabase
      .channel(`sms-credits:${userId}:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sms_credits', filter: `event_id=eq.${eventId}` },
        () => fetchCredits()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, userId, fetchCredits]);

  const isLow = credits.total > 0 && credits.remaining > 0 && credits.remaining <= Math.max(10, Math.floor(credits.total * 0.1));
  const isEmpty = credits.total > 0 && credits.remaining <= 0;
  const isUnactivated = credits.total === 0;

  return { credits, loading, isLow, isEmpty, isUnactivated, refetch: fetchCredits };
};
