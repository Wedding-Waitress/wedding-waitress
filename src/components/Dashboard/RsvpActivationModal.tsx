import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone, CreditCard, Check, Loader2 } from "lucide-react";
import { getPricingTier } from '@/hooks/useRsvpPurchase';
import { getRsvpTier } from '@/lib/stripePrices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RsvpActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalGuestCount: number;
  onPayNow: () => void;
  eventId?: string | null;
}

export const RsvpActivationModal: React.FC<RsvpActivationModalProps> = ({
  isOpen,
  onClose,
  totalGuestCount,
  onPayNow,
  eventId,
}) => {
  const pricing = getPricingTier(totalGuestCount);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayNow = async () => {
    if (!eventId) {
      onPayNow();
      return;
    }

    setLoading(true);
    try {
      const tier = getRsvpTier(totalGuestCount);
      const body = {
        price_id: tier.price_id,
        mode: 'payment',
        event_id: eventId,
        plan_type: 'rsvp',
      };

      const invokeAttempt = async () => {
        const { data, error } = await supabase.functions.invoke('create-checkout', { body });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return data;
      };

      let data;
      try {
        data = await invokeAttempt();
      } catch {
        // Retry once after 2s (handles cold starts)
        await new Promise(r => setTimeout(r, 2000));
        data = await invokeAttempt();
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-primary" />
            Activate and Send RSVP Invites
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
          <Button onClick={onClose} className="rounded-full bg-red-500 hover:bg-red-600 text-white" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handlePayNow}
            disabled={loading}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            Pay Now — ${pricing.price} AUD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
