import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
        `https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/send-rsvp-email`,
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
        toast({ title: "Error", description: result.error || "Failed to send emails", variant: "destructive" });
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

      const response = await fetch(
        `https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/send-rsvp-sms`,
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
        toast({ title: "Error", description: result.error || "Failed to send SMS", variant: "destructive" });
        return null;
      }

      toast({
        title: "SMS Sent",
        description: `Sent: ${result.sent}, Failed: ${result.failed}, Skipped: ${result.skipped}`,
      });

      return result;
    } catch (error) {
      console.error('Error sending SMS invites:', error);
      toast({ title: "Error", description: "Failed to send SMS invites", variant: "destructive" });
      return null;
    } finally {
      setSending(false);
    }
  };

  return { sendEmailInvites, sendSmsInvites, sending };
};
