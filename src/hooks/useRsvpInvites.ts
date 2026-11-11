import { useRef, useState } from 'react';
import { SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
  blocked?: number;
}

export type RsvpInviteChannel = 'email' | 'sms';

export interface ChannelSendResult extends SendResult {
  channel: RsvpInviteChannel;
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
  trackingPending?: number;
}

export interface RsvpInviteSendResult {
  channels: ChannelSendResult[];
  complete: boolean;
  partial: boolean;
  accepted: number;
}

const readFunctionResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { error: `Invitation service returned an invalid response (${response.status}).` }; }
};

export const useRsvpInvites = () => {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const inFlight = useRef(false);
  const uncertainRequests = useRef(new Map<string, string>());

  const requestChannel = async (
    channel: RsvpInviteChannel,
    eventId: string,
    guestIds: string[],
    accessToken: string,
    requestId: string,
  ): Promise<ChannelSendResult> => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-rsvp-${channel}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ event_id: eventId, guest_ids: guestIds, request_id: requestId }),
        }
      );

      const result = await readFunctionResponse(response);
      const counts = {
        sent: Number(result.sent || 0),
        failed: Number(result.failed ?? (response.ok ? 0 : guestIds.length)),
        skipped: Number(result.skipped || 0),
        blocked: Number(result.blocked || 0),
      };
      return {
        channel,
        ...counts,
        ok: response.ok && counts.sent === guestIds.length && counts.failed === 0 && counts.skipped === 0 && counts.blocked === 0 && !result.tracking_pending,
        status: response.status,
        error: typeof result.error === 'string' ? result.error : undefined,
        code: typeof result.code === 'string' ? result.code : undefined,
        trackingPending: Number(result.tracking_pending || 0),
      };
    } catch (error) {
      console.error(`Error calling RSVP ${channel} service:`, error);
      return {
        channel, sent: 0, failed: guestIds.length, skipped: 0, blocked: 0, ok: false, status: 0,
        code: 'INVITATION_SERVICE_UNREACHABLE',
        error: `The ${channel === 'email' ? 'email' : 'SMS'} result could not be confirmed. Check delivery history before retrying; the provider may already have accepted it.`,
      };
    }
  };

  const describeChannel = (result: ChannelSendResult) => {
    const label = result.channel === 'email' ? 'Email' : 'SMS';
    if (result.ok) return `${label}: ${result.sent} accepted by the provider. Delivery is not yet confirmed.`;
    if (result.trackingPending) return `${label}: ${result.sent} accepted by the provider; status tracking is pending. Do not resend.`;
    const counts = `${result.sent} sent, ${result.failed} failed${result.skipped ? `, ${result.skipped} skipped` : ''}${result.blocked ? `, ${result.blocked} blocked` : ''}.`;
    return `${label}: ${counts}${result.error ? ` ${result.error}` : ''}`;
  };

  const sendRsvpInvites = async (
    method: 'email' | 'sms' | 'both',
    eventId: string,
    guestIds: string[],
  ): Promise<RsvpInviteSendResult> => {
    if (inFlight.current) return { channels: [], complete: false, partial: false, accepted: 0 };
    inFlight.current = true;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return { channels: [], complete: false, partial: false, accepted: 0 };
      }

      const signature = `${eventId}:${method}:${[...guestIds].sort().join(',')}`;
      const requestId = uncertainRequests.current.get(signature) ?? crypto.randomUUID();
      uncertainRequests.current.set(signature, requestId);
      const requestedChannels: RsvpInviteChannel[] = method === 'both' ? ['email', 'sms'] : [method];
      // Run both requested channels independently. A rejected email must never prevent the SMS attempt (or vice versa).
      const channels = await Promise.all(requestedChannels.map((channel) =>
        requestChannel(channel, eventId, guestIds, session.access_token, requestId)
      ));
      const accepted = channels.reduce((total, result) => total + result.sent, 0);
      const complete = channels.every((result) => result.ok);
      const partial = accepted > 0 && !complete;
      if (complete) uncertainRequests.current.delete(signature);
      toast({
        title: complete ? 'Invitation sent' : partial ? 'Invitation partially sent' : 'Invitation not sent',
        description: channels.map(describeChannel).join(' '),
        variant: complete ? 'default' : 'destructive',
      });
      return { channels, complete, partial, accepted };
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const sendSingleChannel = async (channel: RsvpInviteChannel, eventId: string, guestIds: string[]): Promise<SendResult | null> => {
    const result = await sendRsvpInvites(channel, eventId, guestIds);
    return result.complete ? result.channels[0] : null;
  };

  const sendEmailInvites = (eventId: string, guestIds: string[]) => sendSingleChannel('email', eventId, guestIds);
  const sendSmsInvites = (eventId: string, guestIds: string[]) => sendSingleChannel('sms', eventId, guestIds);

  return { sendEmailInvites, sendSmsInvites, sendRsvpInvites, sending };
};
