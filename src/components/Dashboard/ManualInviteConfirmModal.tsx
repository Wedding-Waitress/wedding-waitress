import React, { useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import actionStyles from './RsvpInviteActions.module.css';

interface Props {
  isOpen: boolean;
  guestCount: number;
  isUpdating: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ManualInviteConfirmModal: React.FC<Props> = ({ isOpen, guestCount, isUpdating, onClose, onConfirm }) => {
  const confirmingRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const handleConfirm = async () => {
    if (confirmingRef.current || isUpdating) return;
    confirmingRef.current = true;
    setConfirming(true);
    try { await onConfirm(); } finally { confirmingRef.current = false; setConfirming(false); }
  };
  const busy = confirming || isUpdating;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="ww-guest-list-typography max-w-md">
        <DialogHeader><DialogTitle className="mt-6 flex items-center justify-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-primary" />Confirm Manual Status</DialogTitle></DialogHeader>
        <p className="py-4 text-center text-base text-foreground">
          {guestCount === 1
            ? 'Are you sure you want to mark this RSVP invitation as sent manually? Wedding Waitress will not send an email or SMS.'
            : `Are you sure you want to mark these RSVP invitations for ${guestCount} guests as sent manually? Wedding Waitress will not send an email or SMS.`}
        </p>
        <DialogFooter className="gap-2 pb-4 max-sm:flex-col">
          <Button type="button" onClick={handleConfirm} disabled={busy} className={actionStyles.primaryAction}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}Confirm Mark as Sent
          </Button>
          <Button type="button" onClick={onClose} disabled={busy} className={actionStyles.cancelAction}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
