import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export interface RsvpPaymentSuccessData {
  guestCount: number;
  tierLabel: string;
  amount: number;
  ptype: 'rsvp' | 'rsvp_overage';
}

interface RsvpPaymentSuccessModalProps {
  open: boolean;
  data: RsvpPaymentSuccessData | null;
  onClose: () => void;
}

export const RsvpPaymentSuccessModal: React.FC<RsvpPaymentSuccessModalProps> = ({
  open,
  data,
  onClose,
}) => {
  if (!data) return null;

  const { guestCount, tierLabel, amount, ptype } = data;
  const amountDisplay = `$${amount.toFixed(2)} AUD`;
  const tierDisplay =
    ptype === 'rsvp_overage'
      ? `Additional RSVP Allowance${guestCount ? ` (${guestCount} guests)` : ''}`
      : tierLabel
        ? `${tierLabel} RSVP Bundle`
        : 'RSVP Invite Bundle';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mt-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <DialogTitle className="text-center text-xl mt-3 text-[#1D1D1F]">
            Payment Successful
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-center">
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            Your RSVP invitations have been successfully sent to your selected guests.
          </p>
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            You should start receiving replies soon. Please check your dashboard regularly for updates.
          </p>

          <div className="border-2 border-[#967A59]/40 rounded-lg p-4 space-y-1 bg-[#967A59]/5">
            {guestCount > 0 && (
              <p className="text-base font-semibold text-[#1D1D1F]">
                {guestCount} {guestCount === 1 ? 'guest' : 'guests'} invited
              </p>
            )}
            <p className="text-sm text-[#5C4A36]">{tierDisplay}</p>
            <p className="text-lg font-bold text-[#967A59]">{amountDisplay}</p>
          </div>
        </div>

        <DialogFooter className="pb-4">
          <Button
            onClick={onClose}
            className="rounded-full bg-[#967A59] hover:bg-[#7d6448] text-white w-full sm:w-auto sm:mx-auto"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
