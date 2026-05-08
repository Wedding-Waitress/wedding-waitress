import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SMS_TOPUP } from '@/lib/stripePrices';

/**
 * useSmsTopup — start a Stripe Checkout session for the SMS top-up product.
 * Redirects current window to the hosted Checkout page.
 */
export const useSmsTopup = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const startTopup = async (eventId: string) => {
    if (!eventId) {
      toast({ title: 'Error', description: 'Select an event first.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          price_id: SMS_TOPUP.price_id,
          mode: 'payment',
          event_id: eventId,
          purchase_type: 'sms_topup',
        },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error('No checkout URL returned');
      window.location.href = url;
    } catch (err: any) {
      console.error('[useSmsTopup] failed', err);
      toast({
        title: 'Could not start top-up',
        description: err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return { startTopup, loading };
};
