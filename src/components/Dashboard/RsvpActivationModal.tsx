import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone, CreditCard, Check } from "lucide-react";
import { getPricingTier } from '@/hooks/useRsvpPurchase';

interface RsvpActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalGuestCount: number;
  onPayNow: () => void;
}

export const RsvpActivationModal: React.FC<RsvpActivationModalProps> = ({
  isOpen,
  onClose,
  totalGuestCount,
  onPayNow,
}) => {
  const pricing = getPricingTier(totalGuestCount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-primary" />
            Activate RSVP Invites
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* What you get */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">RSVP Invite Bundle includes:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <Mail className="w-4 h-4 text-blue-500" />
                Unlimited Email Invitations
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <Phone className="w-4 h-4 text-green-500" />
                Unlimited SMS Invitations
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="border-2 border-primary rounded-lg p-4 space-y-1 text-center">
            <p className="text-sm text-muted-foreground">
              Based on your guest list ({pricing.label})
            </p>
            <p className="text-3xl font-bold text-primary">${pricing.price} AUD</p>
            <p className="text-xs text-muted-foreground">
              One-time payment per event • Includes both Email & SMS
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={onPayNow}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pay Now — ${pricing.price} AUD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
