import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ReferralEventLite } from '@/hooks/useFirstEventReferral';
import styles from './InviteVenueModal.module.css';

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
      <DialogContent
        className={styles.modal}
        overlayClassName={styles.overlay}
        data-testid="invite-venue-modal"
      >
        <DialogHeader className={styles.header}>
          <DialogTitle className={styles.title}>
            Invite Your Venue
          </DialogTitle>
        </DialogHeader>

        <div className={styles.form}>
          <div className="space-y-1.5">
            <Label className={styles.label}>Venue Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coordinator@venue.com"
              className={styles.input}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={styles.label}>Coordinator Name (optional)</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g., Sarah"
              className={styles.input}
            />
          </div>

          <div className={styles.preview}>
            <p className={styles.previewLabel}>Preview</p>
            <pre className={styles.previewBody}>{previewBody}</pre>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            onClick={handleSend}
            disabled={!validEmail || sending}
            className={`${styles.actionButton} ${styles.sendButton}`}
          >
            <Send size={18} strokeWidth={1.8} aria-hidden />
            {sending ? 'Sending…' : 'Send Invitation'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className={`${styles.actionButton} ${styles.cancelButton}`}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
