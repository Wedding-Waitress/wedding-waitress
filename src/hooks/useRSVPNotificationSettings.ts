import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserNotificationSettings {
  email_notifications: boolean;
  notification_email: string | null;
  notify_on_accept: boolean;
  notify_on_decline: boolean;
  notify_on_update: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  twilio_sender_id: string | null;
}

interface EventAutomationSettings {
  notify_partner1: boolean;
  notify_partner2: boolean;
  notify_event_planner: boolean;
  notify_both_partners: boolean;
  auto_reminders_enabled: boolean;
  reminder_days_before: number;
  reminder_only_no_reply: boolean;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  next_reminder_scheduled_at: string | null;
  last_reminder_sent_at: string | null;
  last_daily_summary_sent_at: string | null;
}

export const useRSVPNotificationSettings = (eventId: string | null) => {
  const [userSettings, setUserSettings] = useState<UserNotificationSettings | null>(null);
  const [eventSettings, setEventSettings] = useState<EventAutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user-level settings
      const { data: userNotifSettings } = await supabase
        .from('rsvp_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserSettings(userNotifSettings || {
        email_notifications: false,
        notification_email: null,
        notify_on_accept: true,
        notify_on_decline: true,
        notify_on_update: true,
        sms_enabled: false,
        whatsapp_enabled: false,
        twilio_sender_id: null,
      });

      // Fetch event-level automation settings
      const { data: eventAutoSettings } = await supabase
        .from('event_rsvp_automation_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      setEventSettings(eventAutoSettings || {
        notify_partner1: true,
        notify_partner2: false,
        notify_event_planner: false,
        notify_both_partners: false,
        auto_reminders_enabled: false,
        reminder_days_before: 7,
        reminder_only_no_reply: true,
        daily_summary_enabled: false,
        daily_summary_time: '08:00:00',
        next_reminder_scheduled_at: null,
        last_reminder_sent_at: null,
        last_daily_summary_sent_at: null,
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveUserSettings = async (updates: Partial<UserNotificationSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('rsvp_notification_settings')
        .upsert({
          user_id: user.id,
          ...updates,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: '✅ User notification settings saved',
      });

      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving user settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save user settings',
        variant: 'destructive',
      });
    }
  };

  const saveEventSettings = async (updates: Partial<EventAutomationSettings>) => {
    if (!eventId) return;

    try {
      const { error } = await supabase
        .from('event_rsvp_automation_settings')
        .upsert({
          event_id: eventId,
          ...updates,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: '✅ Event automation settings saved',
      });

      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving event settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event settings',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [eventId]);

  return {
    userSettings,
    eventSettings,
    loading,
    saveUserSettings,
    saveEventSettings,
    refetch: fetchSettings,
  };
};