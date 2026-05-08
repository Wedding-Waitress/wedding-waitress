import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralEventLite {
  id: string;
  name: string;
  venue?: string | null;
  venue_contact_email?: string | null;
  venue_contact?: string | null;
  partner1_name?: string | null;
  partner2_name?: string | null;
  date?: string | null;
  created_at?: string | null;
}

interface DismissalRow {
  event_id: string;
  snooze_until: string | null;
}

/**
 * Surfaces an event eligible for the elegant venue-referral card.
 * Hides forever if dismissed (snooze_until null) or until snooze_until passes.
 */
export const useFirstEventReferral = (events: ReferralEventLite[] | null | undefined) => {
  const [dismissals, setDismissals] = useState<DismissalRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      setDismissals([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from('event_referral_dismissals')
      .select('event_id,snooze_until')
      .eq('user_id', userRes.user.id);
    setDismissals((data ?? []) as DismissalRow[]);
    setLoaded(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const now = Date.now();
  const isHidden = (eventId: string) => {
    const row = dismissals.find((d) => d.event_id === eventId);
    if (!row) return false;
    if (!row.snooze_until) return true; // permanent dismiss
    return new Date(row.snooze_until).getTime() > now;
  };

  // Pick the earliest created event that's not hidden.
  const sorted = (events ?? []).slice().sort((a, b) => {
    const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ad - bd;
  });
  const referralEvent = sorted.find((e) => !isHidden(e.id)) ?? null;

  const dismiss = useCallback(async (eventId: string, snoozeDays: number | null) => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return;
    const snooze_until = snoozeDays != null
      ? new Date(Date.now() + snoozeDays * 86400000).toISOString()
      : null;
    await supabase.from('event_referral_dismissals').upsert({
      user_id: userRes.user.id,
      event_id: eventId,
      snooze_until,
      dismissed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,event_id' });
    await refresh();
  }, [refresh]);

  return { referralEvent: loaded ? referralEvent : null, dismiss, refresh, loaded };
};
