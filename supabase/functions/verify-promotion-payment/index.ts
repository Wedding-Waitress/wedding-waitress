import Stripe from 'https://esm.sh/stripe@22.4.0';
import { authenticatePromotionRequest, promotionHeaders, promotionReply } from '../_shared/promotionRequestAuth.ts';
import { promotionCompletionAdapter } from '../_shared/promotionProviderAdapter.ts';
import { fulfillPromotionCheckout } from '../_shared/promotionFulfillment.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: promotionHeaders });
  if (req.method !== 'POST') return promotionReply({ error: 'Method not allowed.' }, 405);
  const key = Deno.env.get('STRIPE_PROMOTIONS_RESTRICTED_KEY');
  if (Deno.env.get('PROMOTIONS_ENABLED') !== 'true' || !key?.startsWith('rk_live_')) return promotionReply({ error: 'Promotion verification is not activated.' }, 503);
  try {
    const { user, db } = await authenticatePromotionRequest(req);
    const body = await req.json();
    if (typeof body.session_id !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(body.session_id)) return promotionReply({ error: 'Recorded checkout required.' }, 400);
    const adapter = promotionCompletionAdapter(db, new Stripe(key, { apiVersion: '2026-07-29.dahlia' }), true);
    const stored = await adapter.lookupCheckout(body.session_id);
    if (stored.userId !== user.id) return promotionReply({ error: 'Checkout belongs to another account.' }, 403);
    const result = await fulfillPromotionCheckout(adapter, body.session_id, Date.now());
    return promotionReply({ success: true, type: 'promotion', status: result.activation, expires_at: result.expiresAt,
      starts_at: result.startsAt, included_credits: result.includedCredits,
      percent_off: stored.percent, plan_name: stored.plan === 'unlimited' ? 'Ultimate' : stored.plan === 'premium' ? 'Premium' : 'Essential' });
  } catch { return promotionReply({ error: 'Promotional completion is not yet confirmed. No success is reported.' }, 503); }
});
