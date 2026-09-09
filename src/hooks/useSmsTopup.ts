import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CommunicationCreditPackKey } from '@/lib/stripePrices';
import { usePaymentProcessing } from '@/contexts/PaymentProcessingContext';

/**
 * useSmsTopup — start a Stripe Checkout session for the SMS top-up product.
 * Hardened against double-clicks:
 *  - inFlightRef guards re-entry before React re-renders the disabled state
 *  - global PaymentProcessingContext overlay locks UI through Stripe redirect
 *  - sends an idempotency_key so a retried invoke cannot create two sessions
 */
export const useSmsTopup = () => {
  const [loading, setLoading] = useState(false);
  const [activePack, setActivePack] = useState<CommunicationCreditPackKey | null>(null);
  const inFlightRef = useRef(false);
  const { toast } = useToast();
  const { startProcessing, stopProcessing } = usePaymentProcessing();

  const startTopup = async (eventId: string, pack: CommunicationCreditPackKey = 'credits_100') => {
    if (inFlightRef.current) return;
    if (!eventId) {
      toast({ title: 'Error', description: 'Select an event first.', variant: 'destructive' });
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    setActivePack(pack);
    startProcessing();

    const idempotencyKey =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `communication-topup-${pack}-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'payment',
          event_id: eventId,
          purchase_type: 'communication_topup',
          communication_topup_pack: pack,
          idempotency_key: idempotencyKey,
        },
      });
      if (error) {
        let message = error.message;
        const context = (error as { context?: Response }).context;
        if (context) {
          try {
            const payload = await context.clone().json() as { error?: string };
            if (payload.error) message = payload.error;
          } catch {
            // Keep the standard Functions error when the response is not JSON.
          }
        }
        throw new Error(message);
      }
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No checkout URL returned');
      try { sessionStorage.setItem('ww:returnTab', 'guest-list'); } catch { /* storage may be unavailable */ }
      // Keep overlay on through redirect — do NOT stopProcessing on success.
      window.location.href = url;
    } catch (err: unknown) {
      console.error('[useSmsTopup] failed', err);
      stopProcessing();
      inFlightRef.current = false;
      setLoading(false);
      setActivePack(null);
      toast({
        title: 'Could not start top-up',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return { startTopup, loading, activePack };
};
