import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { NotificationSettings } from '@/types/djQuestionnaire';

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSettings(null);
        return;
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setSettings((data as NotificationSettings) || {
        resend_api_key: null,
        from_email: null,
        email_enabled: false,
        sms_provider: null,
        twilio_account_sid: null,
        twilio_auth_token: null,
        twilio_messaging_service_sid: null,
        sms_enabled: false,
      });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data as NotificationSettings);
      toast({
        title: 'Success',
        description: 'Notification settings saved',
      });

      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const emailEnabled = settings?.email_enabled && 
                       !!settings?.resend_api_key && 
                       !!settings?.from_email;
                       
  const smsEnabled = settings?.sms_enabled && 
                     !!settings?.sms_provider &&
                     !!settings?.twilio_account_sid &&
                     !!settings?.twilio_auth_token;

  return {
    settings,
    loading,
    emailEnabled,
    smsEnabled,
    updateSettings,
    refetch: fetchSettings,
  };
};
