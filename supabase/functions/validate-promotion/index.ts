import { authenticatePromotionRequest } from '../_shared/promotionRequestAuth.ts';
import { normalizePromotionCode, PROMOTION_PLANS } from '../_shared/promotionRules.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type', 'Content-Type': 'application/json' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  try {
    const { user, db } = await authenticatePromotionRequest(req);
    const body = await req.json();
    if (body.purpose !== 'new_plan' || typeof body.plan_key !== 'string' || !Object.hasOwn(PROMOTION_PLANS, body.plan_key)) return reply({ error: 'Promo codes apply only to a first package purchase.' }, 400);
    let code: string;
    try { code = normalizePromotionCode(body.code); } catch { return reply({ error: 'Enter a valid promo code.' }, 400); }
    const quote = await db.rpc('quote_first_purchase_promotion', { p_user: user.id, p_code: code, p_plan: body.plan_key });
    if (quote.error || !quote.data) return reply({ error: 'This offer could not be verified for your first package purchase.' }, 400);
    // Read-only preview: no reservation, payment or entitlement is created here.
    return reply({ success: true, quote: quote.data });
  } catch { return reply({ error: 'Offer validation is unavailable. No payment was started.' }, 503); }
});
