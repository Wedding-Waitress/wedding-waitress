import { useState } from 'react';
import { SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeGuestPhone } from '@/lib/guestPhone';

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
}

export const useRsvpInvites = () => {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendEmailInvites = async (eventId: string, guestIds: string[]): Promise<SendResult | null> => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return null;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-rsvp-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ event_id: eventId, guest_ids: guestIds }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const noCredits = result?.code === 'NO_CREDITS' || response.status === 402;
        toast({ title: noCredits ? 'No Email & SMS credits remaining' : 'Error', description: noCredits ? 'Add 100 credits for $49 AUD to continue sending.' : (result.error || 'Failed to send emails'), variant: "destructive" });
        return null;
      }

      toast({
        title: "Emails Sent",
        description: `Sent: ${result.sent}, Failed: ${result.failed}, Skipped: ${result.skipped}`,
      });

      return result;
    } catch (error) {
      console.error('Error sending email invites:', error);
      toast({ title: "Error", description: "Failed to send email invites", variant: "destructive" });
      return null;
    } finally {
      setSending(false);
    }
  };

  const sendSmsInvites = async (eventId: string, guestIds: string[]): Promise<SendResult | null> => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return null;
      }

      // Older guests may still have national-format numbers. Normalize only
      // the selected event's intended recipients before handing off to SMS.
      const { data: recipients, error: readError } = await supabase.from('guests')
        .select('id, mobile').eq('event_id', eventId).in('id', guestIds);
      if (readError) throw readError;
      const normalized = (recipients || []).map(guest => ({ ...guest, normalized: normalizeGuestPhone(guest.mobile) }));
      for (const guest of normalized) {
        if (guest.normalized && guest.normalized !== guest.mobile) {
          const { error } = await supabase.from('guests').update({ mobile: guest.normalized })
            .eq('event_id', eventId).eq('id', guest.id);
          if (error) throw error;
        }
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-rsvp-sms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ event_id: eventId, guest_ids: guestIds }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const isNoCredits = result?.code === 'NO_CREDITS' || response.status === 402;
        toast({
          title: isNoCredits ? 'No Email & SMS credits remaining' : 'Error',
          description: isNoCredits
            ? 'Add 100 credits for $49 AUD to continue sending.'
            : (result.error || 'Failed to send SMS'),
          variant: 'destructive',
        });
        return null;
      }

      const blocked = (result as any).blocked ?? 0;
      toast({
        title: blocked > 0 ? 'Some SMS blocked' : 'SMS Sent',
        description: `Sent: ${result.sent}, Failed: ${result.failed}, Skipped: ${result.skipped}${blocked ? `, Blocked (no credits): ${blocked}` : ''}`,
        variant: blocked > 0 ? 'destructive' : 'default',
      });

      return result;
    } catch (error) {
      console.error('Error sending SMS invites:', error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to send SMS invites", variant: "destructive" });
      return null;
    } finally {
      setSending(false);
    }
  };

  return { sendEmailInvites, sendSmsInvites, sending };
};
