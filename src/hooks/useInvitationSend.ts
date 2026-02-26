import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
}

export const useInvitationSend = () => {
  const [sending, setSending] = useState(false);

  const sendInvitationEmail = async (
    eventId: string,
    guestIds: string[],
    imageBase64: string,
  ): Promise<SendResult> => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: { event_id: eventId, guest_ids: guestIds, invitation_image_base64: imageBase64 },
      });
      if (error) throw error;
      return data as SendResult;
    } finally {
      setSending(false);
    }
  };

  const sendInvitationSms = async (
    eventId: string,
    guestIds: string[],
  ): Promise<SendResult> => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-rsvp-sms', {
        body: { event_id: eventId, guest_ids: guestIds },
      });
      if (error) throw error;
      return data as SendResult;
    } finally {
      setSending(false);
    }
  };

  return { sending, sendInvitationEmail, sendInvitationSms };
};
