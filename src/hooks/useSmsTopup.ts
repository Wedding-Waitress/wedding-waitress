import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { COMMUNICATION_CREDIT_PACKS, type CommunicationCreditPackKey } from '@/lib/stripePrices';
import { usePaymentProcessing } from '@/contexts/PaymentProcessingContext';

/**
 * useSmsTopup — start a Stripe Checkout session for the SMS top-up product.
 * Hardened against double-clicks:
 *  - inFlightRef guards re-entry before React re-renders the disabled state
 *  - global PaymentProcessingContext overlay locks UI through Stripe redirect
 *  - sends an idempotency_key so a retried invoke cannot create two sessions
 */
import { useCommunicationTopupEligibility } from './useCommunicationTopupEligibility';

export const useSmsTopup = (eventId: string | null | undefined) => {
  const access = useCommunicationTopupEligibility(eventId);
  const scope = useRef(eventId);
  scope.current = eventId;
  useEffect(() => { scope.current = eventId; return () => { scope.current = null; }; }, [eventId]);
  const [loading, setLoading] = useState(false);
  const [activePack, setActivePack] = useState<CommunicationCreditPackKey | null>(null);
  const inFlightRef = useRef(false);
  const { toast } = useToast();
  const { startProcessing, stopProcessing, processing } = usePaymentProcessing();

  const startTopup = async (eventId: string, pack: CommunicationCreditPackKey = 'credits_100') => {
    if (inFlightRef.current || processing) return;
    if (eventId !== scope.current || !(pack in COMMUNICATION_CREDIT_PACKS)) return;
    if (!eventId) {
      toast({ title: 'Error', description: 'Select an event first.', variant: 'destructive' });
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    setActivePack(pack);


    const idempotencyKey =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `communication-topup-${pack}-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const eligibility = await access.refresh();
      if (eventId !== scope.current || !eligibility) return;
      if (eligibility.status !== 'eligible') throw new Error(eligibility.message);
      const accessVersion = access.getVersion();
      startProcessing();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          mode: 'payment',
          event_id: eventId,
          purchase_type: 'communication_topup',
          communication_topup_pack: pack,
          idempotency_key: idempotencyKey,
        },
      });
      if (eventId !== scope.current || accessVersion !== access.getVersion()) { stopProcessing(); return; }
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
        if (context?.status === 403) access.deny(message);
        throw new Error(message);
      }
      if (eventId !== scope.current) { stopProcessing(); return; }
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
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setActivePack(null);
    }
  };

  return { startTopup, loading, activePack, eligibility: access.eligibility, retryEligibility: access.refresh };
};
