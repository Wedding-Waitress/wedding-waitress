import Stripe from 'https://esm.sh/stripe@22.4.0';
import { retrieveWorldwideGstRate, WORLDWIDE_GST_RATE_SECRET } from '../_shared/worldwideGst.ts';

import { authenticatePromotionRequest, promotionHeaders, promotionReply } from '../_shared/promotionRequestAuth.ts';
import { createPromotionCheckout } from '../_shared/promotionCheckoutService.ts';
import { promotionProviderAdapter } from '../_shared/promotionProviderAdapter.ts';
import { normalizePromotionCode, PROMOTION_PLANS, type PromotionPlan } from '../_shared/promotionRules.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: promotionHeaders });
  if (req.method !== 'POST') return promotionReply({ error: 'Method not allowed.' }, 405);
  const key = Deno.env.get('STRIPE_PROMOTIONS_RESTRICTED_KEY');
  const publishable = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
  if (Deno.env.get('PROMOTIONS_ENABLED') !== 'true' || !key?.startsWith('rk_live_') || !publishable?.startsWith('pk_live_')) return promotionReply({ error: 'Promotional checkout is not activated. No payment was started.' }, 503);
  try {
    const { user, db } = await authenticatePromotionRequest(req);
    const body = await req.json();
    if (body.plan_purchase_purpose !== 'new_plan' || body.purchase_consent !== true
      || typeof body.plan_type !== 'string' || !Object.hasOwn(PROMOTION_PLANS, body.plan_type)) return promotionReply({ error: 'First-package purchase and explicit consent required.' }, 400);
    const stripe = new Stripe(key, { apiVersion: '2026-07-29.dahlia' });
    // Read existing registration only. Never create or change tax registrations.
    const registrations = await stripe.tax.registrations.list({ status: 'active', limit: 100 });
    const taxRegistrationVerified = registrations.data.some(registration => registration.country === 'AU' && registration.status === 'active');
    const worldwideGstRateId = await retrieveWorldwideGstRate(stripe, Deno.env.get(WORLDWIDE_GST_RATE_SECRET), true);
    const result = await createPromotionCheckout(promotionProviderAdapter(db, stripe, true), {
      userId: user.id, verifiedEmail: user.email!, code: normalizePromotionCode(body.promo_code),
      plan: body.plan_type as PromotionPlan, consent: true, livemode: true,
      returnOrigin: req.headers.get('Origin') ?? 'https://weddingwaitress.com.au', taxRegistrationVerified, worldwideGstRateId,
    });
    return promotionReply({ client_secret: result.session.client_secret, publishable_key: publishable,
      checkout_quote: { currency: 'AUD', amount: result.quote.subtotalCents },
      promotion: { percent_off: result.reservation.percent_off, included_credits: result.quote.includedCredits } });
  } catch { return promotionReply({ error: 'Promotional checkout could not be confirmed. No success is reported.' }, 503); }
});
