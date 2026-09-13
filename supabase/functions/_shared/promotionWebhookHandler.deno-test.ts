import Stripe from 'https://esm.sh/stripe@22.4.0?target=denonext';
import { promotionWebhookHandler } from './promotionWebhookHandler.ts';

// Disposable, non-account fixture. No API key, provider request or database write.
const secret = 'whsec_local_signature_fixture_only';
const cryptoProvider = Stripe.createSubtleCryptoProvider();
async function signedRequest(body: string, timestamp = Math.floor(Date.now() / 1000), signingSecret = secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return new Request('http://localhost/webhook-fixture', { method: 'POST', body, headers: { 'stripe-signature': `t=${timestamp},v1=${hex}` } });
}
function fixture() {
  const calls: string[] = [];
  const handler = promotionWebhookHandler({
    verify: (body, signature) => Stripe.webhooks.constructEventAsync(body, signature, secret, 300, cryptoProvider),
    fulfill: async sessionId => { calls.push(sessionId); },
  });
  return { calls, handler };
}
const body = JSON.stringify({ id: 'evt_fixture', livemode: true, type: 'checkout.session.completed',
  data: { object: { id: 'cs_fixture', metadata: { promotion_version: '1' } } } });
function assert(condition: boolean) { if (!condition) throw new Error('Webhook fixture assertion failed'); }

Deno.test('real SDK signature verification permits only intact signed completion', async () => {
  const { handler, calls } = fixture();
  assert((await handler(await signedRequest(body))).status === 200);
  assert(calls.length === 1 && calls[0] === 'cs_fixture');
});
Deno.test('real SDK rejects tampered body, wrong secret and stale signature before fulfillment', async () => {
  const { handler, calls } = fixture();
  const signed = await signedRequest(body);
  const tampered = new Request(signed.url, { method: 'POST', headers: signed.headers, body: body.replace('cs_fixture', 'cs_other') });
  assert((await handler(tampered)).status === 400);
  assert((await handler(await signedRequest(body, undefined, 'whsec_wrong_fixture'))).status === 400);
  assert((await handler(await signedRequest(body, Math.floor(Date.now() / 1000) - 600))).status === 400);
  assert(calls.length === 0);
});
Deno.test('signed sandbox and unrelated events cannot grant production access', async () => {
  const { handler, calls } = fixture();
  assert((await handler(await signedRequest(body.replace('"livemode":true', '"livemode":false')))).status === 400);
  assert((await handler(await signedRequest(body.replace('checkout.session.completed', 'checkout.session.expired')))).status === 200);
  assert(calls.length === 0);
});
Deno.test('unconfirmed fulfillment returns retryable failure', async () => {
  const handler = promotionWebhookHandler({
    verify: (raw, signature) => Stripe.webhooks.constructEventAsync(raw, signature, secret, 300, cryptoProvider),
    fulfill: async () => { throw new Error('local unconfirmed fixture'); },
  });
  assert((await handler(await signedRequest(body))).status === 503);
});
