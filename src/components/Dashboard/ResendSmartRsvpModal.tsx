/**
 * ResendSmartRsvpModal — Premium Smart RSVP & Messaging resend tool
 *
 * Lets the event owner re-target a precise audience without re-sending to
 * everyone. Audience segments:
 *   - failed_sms       → guests whose last SMS attempt failed/blocked/undelivered
 *   - non_responders   → invited guests still pending RSVP response
 *   - email_only       → guests previously invited via email (or email_sent manual)
 *   - sms_only         → guests previously invited via SMS  (or sms_sent manual)
 *
 * The resend uses the same edge functions as the initial send, so credit
 * accounting, RLS, and delivery_method logging continue to work unchanged.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Mail, MessageSquare, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSmsCredits } from '@/hooks/useSmsCredits';
import { getCreditHealth } from './SmartSmsCreditStatus';

export type ResendAudience = 'failed_sms' | 'non_responders' | 'email_only' | 'sms_only';
export type ResendChannel = 'email' | 'sms';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null | undefined;
  /**
   * Caller wires in the actual send. Must return truthy on success so we
   * can close the modal. Receives the filtered guest IDs and channel.
   */
  onSend: (channel: ResendChannel, guestIds: string[]) => Promise<unknown>;
}

interface GuestLite {
  id: string;
  first_name: string | null;
  last_name: string | null;
  rsvp: string | null;
  rsvp_invite_status: string | null;
  email: string | null;
  mobile: string | null;
}

const AUDIENCE_LABEL: Record<ResendAudience, string> = {
  failed_sms: 'Resend only failed SMS',
  non_responders: 'Resend only non-responders',
  email_only: 'Resend only Email guests',
  sms_only: 'Resend only SMS guests',
};

const AUDIENCE_HINT: Record<ResendAudience, string> = {
  failed_sms: 'Guests whose last SMS attempt failed, blocked or was undelivered.',
  non_responders: 'Invited guests who have not yet replied (RSVP still pending).',
  email_only: 'Guests previously contacted via Email — re-send the email.',
  sms_only: 'Guests previously contacted via SMS — re-send the SMS.',
};

export const ResendSmartRsvpModal = ({ isOpen, onClose, eventId, onSend }: Props) => {
  const { toast } = useToast();
  const [audience, setAudience] = useState<ResendAudience>('non_responders');
  const [channel, setChannel] = useState<ResendChannel>('email');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [guests, setGuests] = useState<GuestLite[]>([]);
  const [failedSmsGuestIds, setFailedSmsGuestIds] = useState<Set<string>>(new Set());
  const { credits: smsCredits } = useSmsCredits(eventId);
  const smsEmpty = getCreditHealth(smsCredits.remaining, smsCredits.total).state === 'empty';

  // Auto-pair audience → channel for clarity
  useEffect(() => {
    if (audience === 'failed_sms' || audience === 'sms_only') setChannel('sms');
    if (audience === 'email_only') setChannel('email');
  }, [audience]);

  useEffect(() => {
    if (!isOpen || !eventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: g }, { data: logs }] = await Promise.all([
          supabase
            .from('guests')
            .select('id, first_name, last_name, rsvp, rsvp_invite_status, email, mobile')
            .eq('event_id', eventId),
          supabase
            .from('sms_send_logs')
            .select('guest_id, status, last_status_at, created_at')
            .eq('event_id', eventId)
            .order('last_status_at', { ascending: false }),
        ]);
        if (cancelled) return;
        setGuests((g ?? []) as GuestLite[]);
        // Latest log per guest. Only include guests whose latest status is failed/undelivered/blocked.
        const latestByGuest = new Map<string, string>();
        (logs ?? []).forEach((r: any) => {
          if (!r.guest_id) return;
          if (!latestByGuest.has(r.guest_id)) latestByGuest.set(r.guest_id, (r.status || '').toLowerCase());
        });
        const failedSet = new Set<string>();
        latestByGuest.forEach((status, gid) => {
          if (status === 'failed' || status === 'undelivered' || status === 'blocked') failedSet.add(gid);
        });
        setFailedSmsGuestIds(failedSet);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, eventId]);

  const targetGuests = useMemo(() => {
    const status = (g: GuestLite) => (g.rsvp_invite_status ?? 'not_sent').toLowerCase();
    const rsvp = (g: GuestLite) => (g.rsvp ?? 'pending').toLowerCase();
    switch (audience) {
      case 'failed_sms':
        return guests.filter(g => failedSmsGuestIds.has(g.id) && !!g.mobile);
      case 'non_responders':
        return guests.filter(g => status(g) !== 'not_sent' && rsvp(g) === 'pending');
      case 'email_only':
        return guests.filter(g => ['email_sent', 'sent', 'delivered'].includes(status(g)) && !!g.email);
      case 'sms_only':
        return guests.filter(g => ['sms_sent', 'sent', 'delivered'].includes(status(g)) && !!g.mobile);
    }
  }, [audience, guests, failedSmsGuestIds]);

  const reachable = useMemo(
    () => targetGuests.filter(g => (channel === 'email' ? !!g.email : !!g.mobile)),
    [targetGuests, channel],
  );

  const handleSend = async () => {
    if (channel === 'sms' && smsEmpty) {
      toast({
        title: 'SMS credits required',
        description: 'SMS credits required to continue Smart RSVP messaging. Top up to keep sending invites.',
        variant: 'destructive',
      });
      return;
    }
    if (reachable.length === 0) {
      toast({
        title: 'No reachable guests',
        description: `No guests in this segment have a ${channel === 'email' ? 'valid email' : 'mobile number'}.`,
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    try {
      const ok = await onSend(channel, reachable.map(g => g.id));
      if (ok) {
        toast({
          title: 'Resend triggered',
          description: `Re-sending ${reachable.length} ${channel === 'email' ? 'email' : 'SMS'} invitation${reachable.length === 1 ? '' : 's'}.`,
        });
        onClose();
      }
    } catch (err) {
      toast({
        title: 'Resend failed',
        description: err instanceof Error ? err.message : 'Could not start resend.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="ww-guest-list-dialog ww-guest-resend-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg mt-6">
            <RefreshCw className="w-5 h-5 text-primary" />
            Resend Smart RSVP
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Precision re-targeting — re-send only to the guests that need it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Audience</label>
            <Select value={audience} onValueChange={(v) => setAudience(v as ResendAudience)}>
              <SelectTrigger className="lv-premium-shade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="ww-guest-list-menu">
                {(Object.keys(AUDIENCE_LABEL) as ResendAudience[]).map(a => (
                  <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{AUDIENCE_HINT[audience]}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Channel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`rounded-lg border-2 p-3 flex items-center justify-center gap-2 text-sm lv-premium-shade ${
                  channel === 'email' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <Mail className="w-4 h-4 text-blue-500" /> Email
              </button>
              <button
                type="button"
                onClick={() => { if (!smsEmpty) setChannel('sms'); }}
                disabled={smsEmpty}
                title={smsEmpty ? 'SMS credits required to continue Smart RSVP messaging.' : undefined}
                className={`rounded-lg border-2 p-3 flex items-center justify-center gap-2 text-sm lv-premium-shade disabled:opacity-50 disabled:cursor-not-allowed ${
                  channel === 'sms' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" /> SMS
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Guests in segment</span>
            <Badge variant="outline" className="font-semibold">
              {loading ? '…' : `${reachable.length} reachable / ${targetGuests.length} matched`}
            </Badge>
          </div>

          {!loading && targetGuests.length > 0 && reachable.length === 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>No guests in this segment have a valid {channel === 'email' ? 'email address' : 'mobile number'}. Switch channel or audience.</span>
            </div>
          )}

          {channel === 'sms' && smsEmpty && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>SMS credits required to continue Smart RSVP messaging. Top up to keep sending invites.</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pb-4">
          <Button
            onClick={onClose}
            disabled={sending}
            className="rounded-full bg-red-500 hover:bg-red-600 text-white lv-premium-shade"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || loading || reachable.length === 0 || (channel === 'sms' && smsEmpty)}
            title={channel === 'sms' && smsEmpty ? 'SMS credits required to continue Smart RSVP messaging.' : undefined}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white lv-premium-shade disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Resend to {reachable.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
