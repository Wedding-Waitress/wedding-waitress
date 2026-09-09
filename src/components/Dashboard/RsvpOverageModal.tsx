import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Users, Plus } from 'lucide-react';
import {
  blocksForGuestShortfall,
  GUEST_CAPACITY_BLOCK,
  guestCapacityQuote,
  normalizeGuestCapacityBlocks,
} from '@/lib/guestCapacity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RsvpOverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  currentGuestCount: number;
  totalCapacity: number; // plan allowance + already-purchased capacity
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
  const [selectedBlocks, setSelectedBlocks] = useState(1);
  const { toast } = useToast();

  const shortfall = Math.max(0, currentGuestCount - totalCapacity);
  const suggestedBlocks = blocksForGuestShortfall(currentGuestCount, totalCapacity);
  const { blocks, additionalGuests, totalAud } = guestCapacityQuote(selectedBlocks);

  useEffect(() => {
    if (isOpen) setSelectedBlocks(suggestedBlocks);
  }, [isOpen, suggestedBlocks]);

  const handlePayNow = async () => {
    if (!eventId || blocks < 1) return;
    setLoading(true);
    try {
      const body = {
        mode: 'payment',
        event_id: eventId,
        purchase_type: 'guest_capacity_topup',
        quantity: blocks,
        guest_count_at_purchase: currentGuestCount,
        idempotency_key: `guest-capacity-${eventId}-${crypto.randomUUID()}`,
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
          sessionStorage.setItem('ww:rsvpSelectedCount', String(additionalGuests));
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
            Add Guest Capacity
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
              <span className="text-muted-foreground">Your current capacity ({tierLabel || 'plan'} + add-ons)</span>
              <span className="font-semibold">{totalCapacity}</span>
            </div>
            {shortfall > 0 && <div className="flex items-center justify-between text-destructive">
              <span>Capacity needed now</span>
              <span className="font-semibold">{shortfall} guests</span>
            </div>}
          </div>

          <div className="border-2 border-primary rounded-lg p-4 space-y-1 text-center">
            <label htmlFor="guest-capacity-blocks" className="block text-sm font-semibold text-foreground">
              How many blocks of 10 guest spaces would you like to add?
            </label>
            <select
              id="guest-capacity-blocks"
              value={blocks}
              onChange={(event) => setSelectedBlocks(normalizeGuestCapacityBlocks(Number(event.target.value)))}
              className="mx-auto mt-2 h-10 min-w-32 rounded-lg border border-input bg-background px-3 text-center text-sm"
              disabled={loading}
            >
              {Array.from({ length: GUEST_CAPACITY_BLOCK.maximumBlocksPerCheckout }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>{value} block{value === 1 ? '' : 's'}</option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              Add {blocks} × {GUEST_CAPACITY_BLOCK.guests}-guest block{blocks === 1 ? '' : 's'}{' '}
              (+{additionalGuests} guest spaces)
            </p>
            <p className="text-3xl font-bold text-primary">${totalAud} AUD</p>
            <p className="text-xs text-muted-foreground">
              ${GUEST_CAPACITY_BLOCK.priceAud} AUD per block of {GUEST_CAPACITY_BLOCK.guests} • One-time
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Resulting guest capacity: <span className="font-semibold">{totalCapacity + additionalGuests}</span>
            {' '}({totalCapacity} + {additionalGuests})
          </p>
        </div>

        <DialogFooter className="gap-2 pb-6">
          <Button
            onClick={handlePayNow}
            disabled={loading || blocks < 1}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Pay Now — ${totalAud} AUD
          </Button>
          <Button onClick={onClose} className="rounded-full bg-red-500 hover:bg-red-600 text-white" disabled={loading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
