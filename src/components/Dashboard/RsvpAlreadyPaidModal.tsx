import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Phone } from "lucide-react";

interface RsvpAlreadyPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  tierLabel: string;
  amountPaid: number;
  paidAt: string;
  currentGuestCount: number;
  tierMax: number;
}

export const RsvpAlreadyPaidModal: React.FC<RsvpAlreadyPaidModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  tierLabel,
  amountPaid,
  paidAt,
  currentGuestCount,
  tierMax,
}) => {
  const remaining = Math.max(tierMax - currentGuestCount, 0);
  const formattedDate = paidAt
    ? new Date(paidAt).toLocaleDateString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="ww-guest-list-typography max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg mt-8 text-left">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            You're already activated
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-lg:px-3">
          {/* What's covered */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Your RSVP Invite Bundle covers:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-blue-500" />
                Unlimited Email Invitations
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-green-500" />
                Unlimited SMS Invitations
              </li>
            </ul>
          </div>

          {/* Paid summary */}
          <div className="border-2 border-green-600 rounded-lg p-4 space-y-1 text-center">
            <p className="text-sm text-muted-foreground">
              You paid <span className="font-semibold text-foreground">${Number(amountPaid).toFixed(0)} AUD</span> for the {tierLabel} tier
            </p>
            {formattedDate && (
              <p className="text-xs text-muted-foreground">Activated on {formattedDate}</p>
            )}
          </div>

          {/* Usage */}
          <div className="rounded-lg p-4 bg-green-50 border border-green-200 text-center">
            <p className="text-sm text-foreground">
              You have <span className="font-semibold">{currentGuestCount}</span> of <span className="font-semibold">{tierMax}</span> guests in your list.
            </p>
            <p className="text-sm text-green-700 font-semibold mt-1">
              {remaining} guests remaining at no extra cost.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Keep sending Email & SMS invites for this event at no additional charge as long as your guest count stays within this tier.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pb-6 max-lg:px-3 max-lg:flex-row">
          <Button
            onClick={onContinue}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white h-11 max-lg:flex-1"
          >
            Continue to Send Invites
          </Button>
          <Button
            onClick={onClose}
            className="rounded-full bg-red-500 hover:bg-red-600 text-white h-11 max-lg:flex-1"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
