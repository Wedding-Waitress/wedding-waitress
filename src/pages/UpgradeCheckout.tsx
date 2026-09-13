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
import { usePaymentProcessing } from '@/contexts/PaymentProcessingContext';
import { formatLivePrice } from '@/lib/liveCurrencyPricing';
import { gstInclusiveAud, PACKAGE_CHECKOUT_AVAILABLE, PACKAGE_CHECKOUT_NOTICE } from '@/lib/packagePricing';
import { CheckoutPromotion } from '@/components/Pricing/CheckoutPromotion';

let stripePromise: Promise<Stripe | null> | null = null;
let stripePromiseKey: string | null = null;
const getStripe = (publishableKey: string) => {
  if (!stripePromise || stripePromiseKey !== publishableKey) {
    stripePromiseKey = publishableKey;
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export const UpgradeCheckout: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const planKey = (params.get('plan') as PlanKey) || 'premium';
  const fromKey = (params.get('from') as PlanKey | null) || null;
  const plan = PLAN_DETAILS[planKey];
  const requestedCurrency = 'AUD';
  const fromPlan = fromKey ? PLAN_DETAILS[fromKey] : null;
  // Difference-only pricing applies between two one-time wedding plans.
  const isDiffUpgrade =
    !!fromPlan && fromPlan.mode === 'payment' && plan?.mode === 'payment' && fromPlan.key !== plan.key;
  const diffAmount = isDiffUpgrade ? Math.max(0, plan.price_aud - fromPlan!.price_aud) : 0;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storedCheckoutQuote, setCheckoutQuote] = useState<{ currency: string; amount: number } | null>(null);
  const [loadedSelection, setLoadedSelection] = useState<string | null>(null);
  const [consentedSelection, setConsentedSelection] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const purchasePurpose = isDiffUpgrade ? 'upgrade' : params.get('purpose') === 'renewal' ? 'renewal' : 'new_plan';
  const selectionIdentity = `${planKey}:${fromKey ?? ''}:${purchasePurpose}:${promoCode.trim().toUpperCase()}`;
  const consented = consentedSelection === selectionIdentity;
  const checkoutReady = loadedSelection === selectionIdentity && !!clientSecret && !!publishableKey;
  const checkoutQuote = loadedSelection === selectionIdentity ? storedCheckoutQuote : null;
  const { processing, startProcessing } = usePaymentProcessing();

  // Fallback: when Stripe begins redirecting after Pay, the iframe takes
  // focus then the window navigates. Listening for visibility/blur lets
  // us catch the redirect even if the iframe pointerdown was missed.
  useEffect(() => {
    if (!PACKAGE_CHECKOUT_AVAILABLE) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') startProcessing();
    };
    const onBeforeUnload = () => startProcessing();
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [startProcessing]);

  useEffect(() => {
    if (!plan) {
      setError('Unknown plan');
      return;
    }
    if (!PACKAGE_CHECKOUT_AVAILABLE) {
      setError(PACKAGE_CHECKOUT_NOTICE);
      return;
    }
    if (!consented) return;
    setError(null);
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

        const { data, error: fnError } = await supabase.functions.invoke(purchasePurpose === 'new_plan' && promoCode.trim() ? 'create-promotion-checkout' : 'create-checkout', {
          body: {
            price_id: plan.price_id,
            mode: plan.mode,
            plan_type: plan.key,
            pricing_currency: requestedCurrency,
            ui_mode: 'embedded',
            purchase_consent: true,
            plan_purchase_purpose: purchasePurpose,
            ...(purchasePurpose === 'new_plan' && promoCode.trim() ? { promo_code: promoCode.trim() } : {}),
            ...(isDiffUpgrade ? { upgrade_from_plan: fromPlan!.key } : {}),
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
        if (data.checkout_quote) {
          if (String(data.checkout_quote.currency).toUpperCase() !== 'AUD') throw new Error('Checkout returned a non-AUD price. No payment was started.');
          setCheckoutQuote(data.checkout_quote);
        }
        setLoadedSelection(selectionIdentity);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to start checkout';
        setError(msg);
        toast({ title: 'Checkout error', description: msg, variant: 'destructive' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan, isDiffUpgrade, fromPlan, requestedCurrency, toast, navigate, consented, purchasePurpose, selectionIdentity]);

  if (!plan) {
    return <div className="p-8">Unknown plan.</div>;
  }

  if (PACKAGE_CHECKOUT_AVAILABLE && !consented) return <main className="min-h-screen bg-[#FBF9F4] p-8 text-[#2f1b14]">
    <h1 className="text-2xl font-semibold">Confirm {plan.name} checkout</h1>
    <p className="my-4">{isDiffUpgrade ? 'This upgrade preserves your original access expiry.'
      : 'Your 12-month access term starts only when your payment succeeds. Logging in does not charge you.'}</p>
    <p className="my-4">A${isDiffUpgrade ? diffAmount : plan.price_aud} excluding GST.</p>
    {purchasePurpose === 'new_plan' && ['essential', 'premium', 'unlimited'].includes(planKey) && <CheckoutPromotion planKey={planKey as import('../../supabase/functions/_shared/promotionRules').PromotionPlan} onCodeChange={setPromoCode} />}
    <Button onClick={() => setConsentedSelection(selectionIdentity)}>I agree — continue to checkout</Button>
    <Button variant="outline" className="ml-3" onClick={() => navigate(-1)}>Not now</Button>
  </main>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF9F4] to-[#F4EDE0]">
      <SeoHead title={`Checkout – ${plan.name}`} description={plan.description} />
      {/* Overlay is mounted globally in App.tsx — no local render here */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/account/plan-billing')}
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
            {!PACKAGE_CHECKOUT_AVAILABLE && purchasePurpose === 'new_plan' && ['essential', 'premium', 'unlimited'].includes(planKey) && <CheckoutPromotion planKey={planKey as import('../../supabase/functions/_shared/promotionRules').PromotionPlan} onCodeChange={setPromoCode} />}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-900">{checkoutQuote ? formatLivePrice(checkoutQuote.currency as import('@/lib/currencyPricing').CurrencyCode, checkoutQuote.amount / 100) : `A$${plan.price_aud}`}</span>
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
              <span className="text-sm text-gray-600">Advertised price (ex GST)</span>
              <span className="text-lg font-bold text-gray-900">
                {checkoutQuote ? formatLivePrice(checkoutQuote.currency as import('@/lib/currencyPricing').CurrencyCode, checkoutQuote.amount / 100) : `A$${isDiffUpgrade ? diffAmount : plan.price_aud}`}
                {plan.recurring ? `/${plan.recurring}` : ''}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>Australian total including GST</span>
              <strong>A${gstInclusiveAud(checkoutQuote ? checkoutQuote.amount / 100 : isDiffUpgrade ? diffAmount : plan.price_aud)}{plan.recurring ? `/${plan.recurring}` : ''}</strong>
            </div>
            {isDiffUpgrade && (
              <p className="text-xs text-muted-foreground mt-2">
                You only pay the difference between your {fromPlan!.name} (A${fromPlan!.price_aud})
                and {plan.name} (A${plan.price_aud}).
              </p>
            )}
            <p className="mt-4 text-xs leading-5 text-gray-500">Advertised prices exclude GST. Australian GST is added once at checkout where applicable.</p>
          </div>

          {/* RIGHT: Embedded Stripe Checkout */}
          <div
            className="bg-white rounded-2xl p-2 shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-[#E8E1D6]/60 min-h-[600px]"
            onPointerDownCapture={(e) => {
              // Stripe's Pay button lives inside an iframe. When the user
              // clicks anywhere inside the embedded checkout iframe, the
              // browser fires a pointerdown on the iframe element itself.
              const target = e.target as HTMLElement;
              if (target?.tagName === 'IFRAME') {
                startProcessing();
              }
            }}
          >
            {error && (
              <div className="p-8 text-center text-sm font-medium text-[#70452f]">
                {error}
              </div>
            )}
            {!error && !checkoutReady && (
              <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#967A59]" />
              </div>
            )}
            {!error && checkoutReady && clientSecret && publishableKey && (
              <EmbeddedCheckoutProvider
                stripe={getStripe(publishableKey)}
                options={{
                  clientSecret,
                  onComplete: () => startProcessing(),
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
