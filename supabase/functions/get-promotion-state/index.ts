import { authenticatePromotionRequest, promotionHeaders, promotionReply } from '../_shared/promotionRequestAuth.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: promotionHeaders });
  if (req.method !== 'POST') return promotionReply({ error: 'Method not allowed.' }, 405);
  if (Deno.env.get('PROMOTIONS_ENABLED') !== 'true') return promotionReply({ state: 'none', disabled: true });
  try {
    const { user, db } = await authenticatePromotionRequest(req);
    const result = await db.rpc('get_promotion_state', { p_user: user.id });
    if (result.error) return promotionReply({ error: 'Promotion state could not be confirmed.' }, 503);
    return promotionReply({ success: true, ...result.data });
  } catch { return promotionReply({ error: 'Current verified account session required.' }, 401); }
});
