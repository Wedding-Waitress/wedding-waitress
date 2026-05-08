import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useMessagingAnalytics
 * Reusable analytics scaffold for the future Dashboard analytics page.
 * Aggregates messaging + RSVP metrics for a single event.
 *
 * NOTE: Structural scaffolding only. UI is intentionally not wired here.
 */

export interface MessagingAnalytics {
  totalInvitationsSent: number;   // distinct guests with rsvp_invite_status != 'pending'
  smsSent: number;                // count of sms_send_logs.status='sent'
  smsFailed: number;              // count of sms_send_logs.status='failed'
  smsBlocked: number;             // count of sms_send_logs.status='blocked'
  emailsSent: number;             // count of rsvp_invite_logs where channel='email' status='sent'
  rsvpAttending: number;
  rsvpNotAttending: number;
  rsvpPending: number;
  responseRate: number;           // 0..1
  smsCreditsTotal: number;
  smsCreditsUsed: number;
  smsCreditsRemaining: number;
  topupHistory: Array<{
    id: string;
    created_at: string;
    amount_paid: number;
    label: string;
    type: string;
  }>;
}

const EMPTY: MessagingAnalytics = {
  totalInvitationsSent: 0,
  smsSent: 0,
  smsFailed: 0,
  smsBlocked: 0,
  emailsSent: 0,
  rsvpAttending: 0,
  rsvpNotAttending: 0,
  rsvpPending: 0,
  responseRate: 0,
  smsCreditsTotal: 0,
  smsCreditsUsed: 0,
  smsCreditsRemaining: 0,
  topupHistory: [],
};

export const useMessagingAnalytics = (eventId: string | null | undefined) => {
  const [data, setData] = useState<MessagingAnalytics>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!eventId) { setData(EMPTY); return; }
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setData(EMPTY); return; }

      const [
        guestsRes,
        smsLogsRes,
        emailLogsRes,
        creditsRes,
        purchasesRes,
      ] = await Promise.all([
        supabase.from('guests').select('id, rsvp, rsvp_invite_status').eq('event_id', eventId),
        supabase.from('sms_send_logs').select('status').eq('event_id', eventId),
        supabase.from('rsvp_invite_logs').select('status').eq('event_id', eventId).eq('channel', 'email').eq('status', 'sent'),
        supabase.rpc('get_sms_credits', { _user_id: uid, _event_id: eventId }),
        supabase
          .from('rsvp_invite_purchases')
          .select('id, created_at, amount_paid, guest_tier_label, purchase_type')
          .eq('event_id', eventId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
      ]);

      const guests = guestsRes.data ?? [];
      const smsLogs = smsLogsRes.data ?? [];
      const totalGuests = guests.length;
      const attending = guests.filter(g => (g.rsvp ?? '').toLowerCase() === 'attending').length;
      const notAttending = guests.filter(g => (g.rsvp ?? '').toLowerCase() === 'not attending').length;
      const pending = totalGuests - attending - notAttending;
      const invited = guests.filter(g => g.rsvp_invite_status && g.rsvp_invite_status !== 'pending').length;

      const creditsRow = Array.isArray(creditsRes.data) ? creditsRes.data[0] : creditsRes.data;

      setData({
        totalInvitationsSent: invited,
        smsSent: smsLogs.filter(l => l.status === 'sent').length,
        smsFailed: smsLogs.filter(l => l.status === 'failed').length,
        smsBlocked: smsLogs.filter(l => l.status === 'blocked').length,
        emailsSent: emailLogsRes.data?.length ?? 0,
        rsvpAttending: attending,
        rsvpNotAttending: notAttending,
        rsvpPending: pending,
        responseRate: totalGuests > 0 ? (attending + notAttending) / totalGuests : 0,
        smsCreditsTotal: Number((creditsRow as any)?.total ?? 0),
        smsCreditsUsed: Number((creditsRow as any)?.used ?? 0),
        smsCreditsRemaining: Number((creditsRow as any)?.remaining ?? 0),
        topupHistory: (purchasesRes.data ?? []).map(p => ({
          id: p.id,
          created_at: p.created_at,
          amount_paid: Number(p.amount_paid ?? 0),
          label: p.guest_tier_label ?? '',
          type: p.purchase_type ?? '',
        })),
      });
    } catch (err) {
      console.error('[useMessagingAnalytics] failed', err);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
};
