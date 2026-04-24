import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { PLAN_DETAILS, type PlanKey } from '@/lib/upgradePlans';
import { PaymentProcessingOverlay } from '@/components/Checkout/PaymentProcessingOverlay';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = (publishableKey: string) => {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
};

export const UpgradeCheckout: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const planKey = (params.get('plan') as PlanKey) || 'premium';
  const plan = PLAN_DETAILS[planKey];

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!plan) {
      setError('Unknown plan');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Explicitly fetch session and pass JWT so the edge function always
        // receives a valid Authorization header.
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session?.access_token) {
          setError('Please sign in again to continue with checkout.');
          return;
        }

        const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
          body: {
            price_id: plan.price_id,
            mode: plan.mode,
            plan_type: plan.key,
            ui_mode: 'embedded',
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (cancelled) return;
        // Surface backend error message if present (invoke returns data even on non-2xx)
        if (data?.error) {
          throw new Error(data.error);
        }
        if (fnError) throw fnError;
        if (!data?.client_secret || !data?.publishable_key) {
          throw new Error('Checkout session did not return a client secret.');
        }
        const pk: string = data.publishable_key;
        if (!pk.startsWith('pk_live_') && !pk.startsWith('pk_test_')) {
          console.error('[UpgradeCheckout] Invalid publishable key prefix:', pk.slice(0, 8));
          throw new Error('Payment system is misconfigured. Please contact support.');
        }
        setClientSecret(data.client_secret);
        setPublishableKey(pk);
      } catch (e: any) {
        const msg = e?.message || 'Failed to start checkout';
        setError(msg);
        toast({ title: 'Checkout error', description: msg, variant: 'destructive' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan?.price_id, plan?.mode, plan?.key, toast]);

  if (!plan) {
    return <div className="p-8">Unknown plan.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF9F4] to-[#F4EDE0]">
      <SeoHead title={`Checkout – ${plan.name}`} description={plan.description} />
      {processing && <PaymentProcessingOverlay />}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/upgrade')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to plans
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Selected plan summary */}
          <div className="bg-white rounded-2xl p-8 shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-[#E8E1D6]/60 h-fit">
            <p className="text-sm uppercase tracking-wide text-[#967A59] font-semibold mb-2">Selected Plan</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{plan.name}</h2>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-900">A${plan.price_aud}</span>
              {plan.original_price_aud && (
                <span className="text-gray-400 line-through text-lg">A${plan.original_price_aud}</span>
              )}
              {plan.recurring && (
                <span className="text-gray-500 text-base">/{plan.recurring}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-6">{plan.description}</p>
            <ul className="space-y-3 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-[#967A59] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Total due today</span>
              <span className="text-lg font-bold text-gray-900">
                A${plan.price_aud}{plan.recurring ? `/${plan.recurring}` : ''}
              </span>
            </div>
          </div>

          {/* RIGHT: Embedded Stripe Checkout */}
          <div className="bg-white rounded-2xl p-2 shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-[#E8E1D6]/60 min-h-[600px]">
            {error && (
              <div className="p-6 text-center text-sm text-red-600">
                {error}
              </div>
            )}
            {!error && (!clientSecret || !publishableKey) && (
              <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#967A59]" />
              </div>
            )}
            {!error && clientSecret && publishableKey && (
              <EmbeddedCheckoutProvider
                stripe={getStripe(publishableKey)}
                options={{
                  clientSecret,
                  onComplete: () => setProcessing(true),
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeCheckout;
