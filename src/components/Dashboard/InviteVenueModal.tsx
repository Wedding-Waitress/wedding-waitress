import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ReferralEventLite } from '@/hooks/useFirstEventReferral';

interface InviteVenueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: ReferralEventLite;
}

export const InviteVenueModal: React.FC<InviteVenueModalProps> = ({ open, onOpenChange, event }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(event.venue_contact_email ?? '');
      setContactName(event.venue_contact ?? '');
    }
  }, [open, event.venue_contact_email, event.venue_contact]);

  const validEmail = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const previewBody = useMemo(() => {
    const couple = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');
    const greeting = contactName.trim() ? `Hi ${contactName.trim()},` : 'Hello,';
    return [
      greeting,
      `${couple || 'A couple'} is currently using Wedding Waitress to plan their wedding${event.venue ? ` at ${event.venue}` : ''}, and thought your venue may also benefit from the platform.`,
      'Wedding Waitress helps with guest management, RSVP coordination, planning workflows, seating management, and operational efficiency for events of every size.',
      'You can explore at your own pace — no pressure, no commitment.',
    ].join('\n\n');
  }, [event, contactName]);

  const handleSend = async () => {
    if (!validEmail) return;
    setSending(true);
    try {
      // Persist email back onto event so it prefills next time
      if (email.trim() !== (event.venue_contact_email ?? '')) {
        await supabase
          .from('events')
          .update({ venue_contact_email: email.trim() })
          .eq('id', event.id);
      }

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) throw new Error('Not authenticated');

      const { error: insertErr } = await supabase.from('venue_invitations').insert({
        event_id: event.id,
        user_id: userRes.user.id,
        venue_name: event.venue ?? null,
        venue_email: email.trim(),
        venue_contact_name: contactName.trim() || null,
        status: 'sent',
      });
      if (insertErr && !insertErr.message.includes('duplicate')) {
        throw insertErr;
      }

      const { error: fnErr } = await supabase.functions.invoke('send-venue-invitation', {
        body: { event_id: event.id, venue_email: email.trim(), venue_contact_name: contactName.trim() || null },
      });
      if (fnErr) throw fnErr;

      toast({ title: 'Invitation sent', description: 'Your venue will receive an elegant introduction shortly.' });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Could not send invitation',
        description: e?.message ?? 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-lg:p-0 max-lg:gap-0">
        <DialogHeader className="max-lg:pt-6 max-lg:px-3">
          <DialogTitle className="text-xl font-medium text-primary text-center lg:text-left">
            Invite Your Venue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-lg:gap-5 max-lg:px-3 max-lg:pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Venue Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coordinator@venue.com"
              className="h-11 rounded-full border-2 border-primary px-4 text-base lg:text-sm"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Coordinator Name (optional)</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g., Sarah"
              className="h-11 rounded-full border-2 border-primary px-4 text-base lg:text-sm"
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Preview</p>
            <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">{previewBody}</pre>
          </div>
        </div>

        <div className="flex flex-row gap-3 pt-4 max-lg:px-3 max-lg:pb-4">
          <Button
            onClick={handleSend}
            disabled={!validEmail || sending}
            className="lv-premium-shade flex-1 h-11 rounded-full bg-green-500 hover:bg-green-600 text-white inline-flex items-center justify-center gap-[6px]"
          >
            <Send size={18} strokeWidth={1.8} aria-hidden />
            {sending ? 'Sending…' : 'Send Invitation'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="lv-premium-shade flex-1 h-11 rounded-full inline-flex items-center justify-center gap-[6px]"
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
