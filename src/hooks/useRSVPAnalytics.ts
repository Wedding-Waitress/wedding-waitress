import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RSVPAnalytics {
  totalRemindersSent: number;
  pendingRsvps: number;
  acceptedRsvps: number;
  declinedRsvps: number;
  nextReminderDate: string | null;
}

export const useRSVPAnalytics = (eventId: string | null) => {
  const [analytics, setAnalytics] = useState<RSVPAnalytics>({
    totalRemindersSent: 0,
    pendingRsvps: 0,
    acceptedRsvps: 0,
    declinedRsvps: 0,
    nextReminderDate: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      // Get total reminders sent
      const { data: campaigns } = await supabase
        .from('rsvp_reminder_campaigns')
        .select('sent_count')
        .eq('event_id', eventId);

      const totalRemindersSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;

      // Get RSVP counts
      const { data: guests } = await supabase
        .from('guests')
        .select('rsvp')
        .eq('event_id', eventId);

      const pendingRsvps = guests?.filter(g => g.rsvp === 'Pending').length || 0;
      const acceptedRsvps = guests?.filter(g => g.rsvp === 'Attending').length || 0;
      const declinedRsvps = guests?.filter(g => g.rsvp === 'Not Attending').length || 0;

      // Get next scheduled reminder
      const { data: automation } = await supabase
        .from('event_rsvp_automation_settings')
        .select('next_reminder_scheduled_at')
        .eq('event_id', eventId)
        .maybeSingle();

      setAnalytics({
        totalRemindersSent,
        pendingRsvps,
        acceptedRsvps,
        declinedRsvps,
        nextReminderDate: automation?.next_reminder_scheduled_at || null,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Subscribe to real-time updates for instant analytics refresh
    if (eventId) {
      const channel = supabase
        .channel(`rsvp-analytics:${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guests',
            filter: `event_id=eq.${eventId}`,
          },
          () => {
            console.log('📊 Real-time guest update detected, refreshing analytics...');
            fetchAnalytics();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rsvp_reminder_campaigns',
            filter: `event_id=eq.${eventId}`,
          },
          () => {
            console.log('📧 Real-time campaign update detected, refreshing analytics...');
            fetchAnalytics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [eventId]);

  return { analytics, loading, refetch: fetchAnalytics };
};