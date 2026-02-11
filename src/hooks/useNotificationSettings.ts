import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSettings {
  resend_api_key: string | null;
  from_email: string | null;
  email_enabled: boolean;
  sms_provider: string | null;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_messaging_service_sid: string | null;
  sms_enabled: boolean;
}

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

      // Use secure RPC function that decrypts sensitive fields server-side
      const { data, error } = await supabase.rpc('get_notification_settings', {
        _user_id: user.id,
      });

      if (error) throw error;

      if (data) {
        setSettings({
          resend_api_key: (data as any).resend_api_key || null,
          from_email: (data as any).from_email || null,
          email_enabled: (data as any).email_enabled || false,
          sms_provider: (data as any).sms_provider || null,
          twilio_account_sid: (data as any).twilio_account_sid || null,
          twilio_auth_token: (data as any).twilio_auth_token || null,
          twilio_messaging_service_sid: (data as any).twilio_messaging_service_sid || null,
          sms_enabled: (data as any).sms_enabled || false,
        });
      } else {
        setSettings({
          resend_api_key: null,
          from_email: null,
          email_enabled: false,
          sms_provider: null,
          twilio_account_sid: null,
          twilio_auth_token: null,
          twilio_messaging_service_sid: null,
          sms_enabled: false,
        });
      }
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

      // Use secure RPC function that encrypts sensitive fields server-side
      const { data, error } = await supabase.rpc('upsert_notification_settings', {
        _user_id: user.id,
        _resend_api_key: updates.resend_api_key || null,
        _from_email: updates.from_email || null,
        _email_enabled: updates.email_enabled || false,
        _sms_provider: updates.sms_provider || null,
        _twilio_account_sid: updates.twilio_account_sid || null,
        _twilio_auth_token: updates.twilio_auth_token || null,
        _twilio_messaging_service_sid: updates.twilio_messaging_service_sid || null,
        _sms_enabled: updates.sms_enabled || false,
      });

      if (error) throw error;

      // Re-fetch to get decrypted values
      await fetchSettings();

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
