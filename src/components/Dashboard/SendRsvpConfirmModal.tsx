import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, AlertCircle, Loader2 } from "lucide-react";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  mobile?: string | null;
}

interface SendRsvpConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channel: 'email' | 'sms';
  selectedGuests: Guest[];
  totalGuestCount: number;
  isSending: boolean;
}

const getPricingTier = (count: number) => {
  if (count <= 100) return { price: 99, label: '1–100 guests' };
  if (count <= 200) return { price: 129, label: '101–200 guests' };
  if (count <= 300) return { price: 149, label: '201–300 guests' };
  if (count <= 400) return { price: 159, label: '301–400 guests' };
  if (count <= 500) return { price: 199, label: '401–500 guests' };
  return { price: 299, label: '501–1000 guests' };
};

export const SendRsvpConfirmModal: React.FC<SendRsvpConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  channel,
  selectedGuests,
  totalGuestCount,
  isSending,
}) => {
  const isEmail = channel === 'email';
  const contactField = isEmail ? 'email' : 'mobile';
  
  const validGuests = selectedGuests.filter(g => {
    const value = isEmail ? g.email : g.mobile;
    return value && value.trim() !== '';
  });
  
  const skippedGuests = selectedGuests.filter(g => {
    const value = isEmail ? g.email : g.mobile;
    return !value || value.trim() === '';
  });

  const pricing = getPricingTier(totalGuestCount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-primary" />
            RSVP Invite Bundle (Email & SMS)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Will send {isEmail ? 'email' : 'SMS'} to:</span>
              <Badge className="bg-green-500 text-white">{validGuests.length} guests</Badge>
            </div>
            {skippedGuests.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Will skip (no {contactField}):</span>
                <Badge variant="secondary">{skippedGuests.length} guests</Badge>
              </div>
            )}
          </div>

          {/* Skipped guests list */}
          {skippedGuests.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Missing {isEmail ? 'email' : 'mobile'} — will be skipped:
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {skippedGuests.slice(0, 10).map(g => (
                  <p key={g.id} className="text-xs text-amber-700">
                    • {g.first_name} {g.last_name}
                  </p>
                ))}
                {skippedGuests.length > 10 && (
                  <p className="text-xs text-amber-600 font-medium">
                    ...and {skippedGuests.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium">Combined Email & SMS ({pricing.label}):</p>
            <p className="text-lg font-bold text-primary">${pricing.price} AUD</p>
            <p className="text-xs text-muted-foreground">
              One-time charge per event. Includes both Email and SMS invitations.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSending || validGuests.length === 0}
            className={`rounded-full text-white ${isEmail ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                {isEmail ? <Mail className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
                Send {validGuests.length} {isEmail ? 'Emails' : 'SMS'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
