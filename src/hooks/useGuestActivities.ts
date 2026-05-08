/**
 * useGuestActivities — CRM-style activity timeline per guest.
 *
 * Future premium feature. Backend + data layer is live; UI is intentionally
 * not yet surfaced in the dashboard. Import this hook when ready to roll out.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GuestActivityType =
  | 'invited_email'
  | 'invited_sms'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'responded'
  | 'resent'
  | 'reminder_sent'
  | 'rsvp_changed'
  | 'plus_one_added'
  | 'note_added'
  | 'bounced'
  | 'failed'
  | 'unsubscribed';

export type GuestActivityChannel = 'email' | 'sms' | 'whatsapp' | 'system' | 'web';
export type GuestActivityStatus = 'success' | 'failure' | 'pending' | 'info';

export interface GuestActivity {
  id: string;
  event_id: string;
  guest_id: string;
  user_id: string;
  activity_type: GuestActivityType;
  channel: GuestActivityChannel;
  status: GuestActivityStatus;
  summary: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export const useGuestActivities = (guestId: string | null | undefined, opts?: { limit?: number; enabled?: boolean }) => {
  const enabled = opts?.enabled ?? true;
  const limit = opts?.limit ?? 100;
  const [activities, setActivities] = useState<GuestActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!guestId || !enabled) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('guest_activities')
      .select('*')
      .eq('guest_id', guestId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (!error) setActivities((data ?? []) as GuestActivity[]);
    setLoading(false);
  }, [guestId, enabled, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Realtime subscription (per-guest)
  useEffect(() => {
    if (!guestId || !enabled) return;
    const channel = supabase
      .channel(`guest-activities:${guestId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'guest_activities', filter: `guest_id=eq.${guestId}` },
        () => fetchActivities()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [guestId, enabled, fetchActivities]);

  /** Manually log an activity from the client (RLS-checked). */
  const logActivity = useCallback(
    async (input: {
      event_id: string;
      activity_type: GuestActivityType;
      channel?: GuestActivityChannel;
      status?: GuestActivityStatus;
      summary?: string;
      metadata?: Record<string, unknown>;
      occurred_at?: string;
    }) => {
      if (!guestId) return null;
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const { data, error } = await (supabase as any).from('guest_activities').insert({
        guest_id: guestId,
        event_id: input.event_id,
        user_id: uid,
        activity_type: input.activity_type,
        channel: input.channel ?? 'system',
        status: input.status ?? 'success',
        summary: input.summary ?? null,
        metadata: input.metadata ?? {},
        occurred_at: input.occurred_at ?? new Date().toISOString(),
      }).select().single();
      if (error) return null;
      return data as GuestActivity;
    },
    [guestId]
  );

  return { activities, loading, refetch: fetchActivities, logActivity };
};
