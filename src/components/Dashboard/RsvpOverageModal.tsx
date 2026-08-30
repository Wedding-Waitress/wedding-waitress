import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Users, Plus } from 'lucide-react';
import { RSVP_OVERAGE } from '@/lib/stripePrices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RsvpOverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  currentGuestCount: number;
  totalCapacity: number; // tier + already-purchased overage
  tierLabel: string;
}

export const RsvpOverageModal: React.FC<RsvpOverageModalProps> = ({
  isOpen,
  onClose,
  eventId,
  currentGuestCount,
  totalCapacity,
  tierLabel,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { shortfall, blocksNeeded, extraGuests, totalCost } = useMemo(() => {
    const sf = Math.max(0, currentGuestCount - totalCapacity);
    const blocks = Math.ceil(sf / RSVP_OVERAGE.guests_per_block);
    return {
      shortfall: sf,
      blocksNeeded: blocks,
      extraGuests: blocks * RSVP_OVERAGE.guests_per_block,
      totalCost: blocks * RSVP_OVERAGE.price_aud,
    };
  }, [currentGuestCount, totalCapacity]);

  const handlePayNow = async () => {
    if (!eventId || blocksNeeded < 1) return;
    setLoading(true);
    try {
      const body = {
        price_id: RSVP_OVERAGE.price_id,
        mode: 'payment',
        event_id: eventId,
        plan_type: 'rsvp',
        purchase_type: 'rsvp_overage',
        quantity: blocksNeeded,
        guest_count_at_purchase: currentGuestCount,
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
        await new Promise(r => setTimeout(r, 2000));
        data = await invokeAttempt();
      }

      if (data?.url) {
        try {
          sessionStorage.setItem('ww:returnTab', 'guest-list');
          // For overage, store the additional guest capacity being purchased.
          sessionStorage.setItem('ww:rsvpSelectedCount', String(extraGuests ?? 0));
        } catch { /* popup navigation is a best-effort fallback */ }
        onClose();
        // Stripe Checkout sets X-Frame-Options: DENY and cannot render inside
        // any iframe (e.g. the Lovable preview). Break out to the top window;
        // if cross-origin top-nav is blocked, fall back to a new tab.
        const inIframe = window.self !== window.top;
        if (inIframe) {
          try {
            window.top!.location.href = data.url;
          } catch {
            window.open(data.url, '_blank', 'noopener,noreferrer');
          }
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="ww-guest-list-typography max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg mt-8 text-left">
            <Plus className="w-5 h-5 text-primary" />
            Add Extra RSVP Invites
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" /> Current guest list
              </span>
              <span className="font-semibold">{currentGuestCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your current allowance ({tierLabel || 'tier'} + add-ons)</span>
              <span className="font-semibold">{totalCapacity}</span>
            </div>
            <div className="flex items-center justify-between text-destructive">
              <span>Over allowance by</span>
              <span className="font-semibold">{shortfall} guests</span>
            </div>
          </div>

          <div className="border-2 border-primary rounded-lg p-4 space-y-1 text-center">
            <p className="text-sm text-muted-foreground">
              Add {blocksNeeded} × {RSVP_OVERAGE.guests_per_block}-guest block{blocksNeeded === 1 ? '' : 's'}{' '}
              (+{extraGuests} guests)
            </p>
            <p className="text-3xl font-bold text-primary">${totalCost} AUD</p>
            <p className="text-xs text-muted-foreground">
              ${RSVP_OVERAGE.price_aud} AUD per {RSVP_OVERAGE.guests_per_block} extra guests • One-time
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            New allowance after purchase: <span className="font-semibold">{totalCapacity + extraGuests}</span> guests
          </p>
        </div>

        <DialogFooter className="gap-2 pb-6">
          <Button onClick={onClose} className="rounded-full bg-red-500 hover:bg-red-600 text-white" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handlePayNow}
            disabled={loading || blocksNeeded < 1}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Pay Now — ${totalCost} AUD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
