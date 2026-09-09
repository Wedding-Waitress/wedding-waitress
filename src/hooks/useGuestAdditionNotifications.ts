import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GuestAdditionNotification {
  id: string;
  event_id: string;
  guest_id: string;
  added_by_guest_id: string | null;
  group_choice: 'separate' | 'group';
  added_guest_name: string;
  added_by_name: string;
  created_at: string;
  reviewed_at: string | null;
  email_status: 'pending' | 'processing' | 'queued' | 'sent' | 'failed' | 'disabled' | 'not_requested';
  sms_status?: 'pending' | 'processing' | 'queued' | 'failed' | 'disabled' | 'not_requested';
}

const isSchemaUnavailable = (error: any) => (
  error?.code === '42P01' || error?.code === 'PGRST205' || /guest_addition_notification/i.test(error?.message || '')
);

export function useGuestAdditionNotifications(eventId: string | null | undefined) {
  const [notifications, setNotifications] = useState<GuestAdditionNotification[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsEligible, setSmsEligible] = useState(false);
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!eventId) {
      setNotifications([]);
      setEmailEnabled(false);
      setSmsEnabled(false);
      setSmsEligible(false);
      setAvailable(false);
      return;
    }
    const [{ data, error }, { data: preference, error: preferenceError }, { data: smsEligibility }] = await Promise.all([
      (supabase as any).from('guest_addition_notifications').select('*').eq('event_id', eventId).is('reviewed_at', null).order('created_at', { ascending: false }),
      (supabase as any).from('guest_addition_notification_preferences').select('email_enabled,sms_enabled').eq('event_id', eventId).maybeSingle(),
      (supabase as any).rpc('get_guest_addition_sms_eligibility', { _event_id: eventId }),
    ]);
    if (error) {
      if (isSchemaUnavailable(error)) {
        setNotifications([]);
        setAvailable(false);
        return;
      }
      console.error('Could not load guest-addition notifications', error);
      return;
    }
    setAvailable(true);
    setNotifications((data || []) as GuestAdditionNotification[]);
    if (!preferenceError) {
      setEmailEnabled(preference?.email_enabled === true);
      setSmsEnabled(preference?.sms_enabled === true);
    }
    setSmsEligible(smsEligibility === true);
  }, [eventId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const markReviewed = useCallback(async (guestId: string) => {
    if (!eventId || saving) return false;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('mark_guest_addition_reviewed', {
        _event_id: eventId,
        _guest_id: guestId,
      });
      if (error || data !== true) throw error || new Error('Review was not saved');
      setNotifications((current) => current.filter((item) => item.guest_id !== guestId));
      return true;
    } catch (error) {
      console.error('Could not mark guest addition reviewed', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [eventId, saving]);

  const setEmailPreference = useCallback(async (enabled: boolean) => {
    if (!eventId || saving) return false;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('set_guest_addition_email_preference', {
        _event_id: eventId,
        _enabled: enabled,
      });
      if (error || data !== true) throw error || new Error('Preference was not saved');
      setEmailEnabled(enabled);
      return true;
    } catch (error) {
      console.error('Could not save guest-addition email preference', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [eventId, saving]);

  const setSmsPreference = useCallback(async (enabled: boolean) => {
    if (!eventId || saving) return false;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('set_guest_addition_sms_preference', {
        _event_id: eventId,
        _enabled: enabled,
      });
      if (error || data !== true) throw error || new Error('Preference was not saved');
      setSmsEnabled(enabled);
      return true;
    } catch (error) {
      console.error('Could not save guest-addition SMS preference', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [eventId, saving]);

  return {
    notifications, emailEnabled, smsEnabled, smsEligible, available, saving,
    refresh, markReviewed, setEmailPreference, setSmsPreference,
  };
}
