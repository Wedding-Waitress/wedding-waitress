import React, { useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import actionStyles from './RsvpInviteActions.module.css';
import {
  deliveryMethodLabel,
  getRsvpDeliverySummary,
  type RsvpContactGuest,
  type RsvpDeliveryMethod,
} from '@/lib/rsvpInviteWorkflow';

interface SendRsvpConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  method: RsvpDeliveryMethod;
  selectedGuests: RsvpContactGuest[];
  creditsRemaining: number;
  isSending: boolean;
}

export const SendRsvpConfirmModal: React.FC<SendRsvpConfirmModalProps> = ({
  isOpen, onClose, onConfirm, method, selectedGuests, creditsRemaining, isSending,
}) => {
  const confirmingRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const summary = getRsvpDeliverySummary(selectedGuests, method);
  const oneGuest = selectedGuests.length === 1;
  const guestName = oneGuest ? `${selectedGuests[0].first_name} ${selectedGuests[0].last_name}`.trim() : '';

  const handleConfirm = async () => {
    if (confirmingRef.current || isSending) return;
    confirmingRef.current = true;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  };

  const busy = confirming || isSending;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="ww-guest-list-typography max-w-md">
        <DialogHeader>
          <DialogTitle className="mt-6 flex items-center justify-center gap-2 text-lg"><Send className="h-5 w-5 text-primary" />Confirm RSVP Invitation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <p className="text-center text-base font-semibold text-foreground">
            {oneGuest
              ? `Are you ready to send this RSVP invitation to ${guestName}?`
              : `Are you ready to send these RSVP invitations to ${selectedGuests.length} guests?`}
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-[#d8c7b2] bg-[#fbf6ed] p-4 text-sm">
            <dt className="text-muted-foreground">Selected</dt><dd className="text-right font-semibold">{oneGuest ? guestName : `${selectedGuests.length} guests`}</dd>
            <dt className="text-muted-foreground">Email recipients</dt><dd className="text-right font-semibold">{summary.emailRecipientCount}</dd>
            <dt className="text-muted-foreground">SMS recipients</dt><dd className="text-right font-semibold">{summary.smsRecipientCount}</dd>
            <dt className="text-muted-foreground">Delivery method</dt><dd className="text-right font-semibold">{deliveryMethodLabel(method)}</dd>
            <dt className="text-muted-foreground">Credits used</dt><dd className="text-right font-semibold">{summary.creditsUsed}</dd>
            <dt className="text-muted-foreground">Credits remaining</dt><dd className="text-right font-semibold">{Math.max(0, creditsRemaining - summary.creditsUsed)}</dd>
          </dl>
        </div>
        <DialogFooter className="gap-2 pb-4 max-sm:flex-col">
          <Button type="button" onClick={handleConfirm} disabled={busy} className={actionStyles.primaryAction}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}<span className="[text-shadow:0_1px_2px_rgba(0,0,0,.55)]">Confirm &amp; Send</span>
          </Button>
          <Button type="button" onClick={onClose} disabled={busy} className={actionStyles.cancelAction}><span>Cancel</span></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
