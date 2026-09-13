import Stripe from 'https://esm.sh/stripe@22.4.0?target=denonext';
import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import { promotionCompletionAdapter } from '../_shared/promotionProviderAdapter.ts';
import { fulfillPromotionCheckout } from '../_shared/promotionFulfillment.ts';
import { promotionWebhookHandler } from '../_shared/promotionWebhookHandler.ts';

// Prepared locally only. Registering or activating this webhook is not authorized.
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const key = Deno.env.get('STRIPE_PROMOTIONS_RESTRICTED_KEY');
  const secret = Deno.env.get('STRIPE_PROMOTIONS_WEBHOOK_SECRET');
  if (Deno.env.get('PROMOTIONS_ENABLED') !== 'true' || !key?.startsWith('rk_live_') || !secret?.startsWith('whsec_')) {
    return new Response('Promotional fulfillment is unavailable', { status: 503 });
  }
  const stripe = new Stripe(key, { apiVersion: '2026-07-29.dahlia', httpClient: Stripe.createFetchHttpClient() });
  return promotionWebhookHandler({
    verify: (body, signature) => stripe.webhooks.constructEventAsync(body, signature, secret, 300, Stripe.createSubtleCryptoProvider()),
    fulfill: sessionId => {
      const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      // Signed delivery alone is insufficient: retrieve full provider evidence.
      return fulfillPromotionCheckout(promotionCompletionAdapter(db, stripe, true), sessionId, Date.now());
    },
  })(req);
});
