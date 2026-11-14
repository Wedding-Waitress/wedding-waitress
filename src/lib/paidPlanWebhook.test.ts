import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import ts from 'typescript';
import { PAID_PLAN_CATALOGUE_VERSION } from '../../supabase/functions/_shared/paidPlanFulfillmentEvidence';
import { fulfillPaidPlanWebhook } from '../../supabase/functions/_shared/paidPlanWebhook';
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fixture = () => ({
  session: { object: 'checkout.session', id: 'cs_live_Original1', livemode: true, mode: 'payment', status: 'complete', payment_status: 'paid',
    created: 1700000000, payment_intent: 'pi_Original1', currency: 'aud', amount_subtotal: 19900, amount_total: 21890,
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 1990 },
    metadata: { user_id: owner, plan_type: 'essential', catalogue_version: PAID_PLAN_CATALOGUE_VERSION, purchase_consent: 'explicit-v1', plan_purchase_purpose: 'renewal' },
    line_items: { has_more: false, data: [{ quantity: 1, amount_subtotal: 19900, price: { currency: 'aud', unit_amount: 19900, product: 'ww_live_20260914_v2_essential' } }] } },
  intent: { object: 'payment_intent', id: 'pi_Original1', livemode: true, status: 'succeeded', latest_charge: 'ch_Original1', currency: 'aud', amount: 21890, amount_received: 21890, created: 1700000001 },
  charge: { object: 'charge', id: 'ch_Original1', payment_intent: 'pi_Original1', livemode: true, status: 'succeeded', paid: true, captured: true, refunded: false, amount_refunded: 0, disputed: false, currency: 'aud', amount: 21890, created: 1700000002 },
  event: { object: 'event', id: 'evt_Original1', livemode: true, type: 'payment_intent.succeeded', created: 1700000400, data: { object: { id: 'pi_Original1', status: 'succeeded' } } },
});

function app({ blocked = false, replay = false, invalidResult = false, ledgerError = false } = {}) {
  const f = fixture();
  const intent = { ...f.intent, latest_charge: f.charge };
  const ledger = { user_id: owner, stripe_session_id: f.session.id, stripe_payment_intent_id: intent.id,
    plan_id: '78cdab0d-d81d-4757-b7cc-f210b8b30f47', purpose: 'renewal', currency: 'AUD',
    amount_subtotal_cents: 19900, amount_total_cents: 21890, catalogue_version: PAID_PLAN_CATALOGUE_VERSION,
    payment_reference_at: new Date(f.event.created * 1000).toISOString() };
  const term = { result: replay ? 'already_fulfilled' : 'fulfilled', plan_id: ledger.plan_id,
    status: 'active', started_at: ledger.payment_reference_at, expires_at: '2024-11-14T22:20:00.000Z' };
  const rpc = vi.fn(async (name: string) => ({ data: name === 'is_account_suspension_blocked' ? blocked : invalidResult ? null : term, error: null }));
  const query: any = { select: () => query, eq: () => query,
    maybeSingle: vi.fn(async () => ({ data: replay ? ledger : null, error: ledgerError ? { message: 'unavailable' } : null })) };
  const admin = { rpc, from: vi.fn(() => query) };
  const stripe = { paymentIntents: { retrieve: vi.fn(async () => intent) },
    events: { list: vi.fn(async () => ({ data: [f.event], has_more: false })) },
    checkout: { sessions: { retrieve: vi.fn(async () => f.session) } },
    webhooks: { constructEventAsync: vi.fn(async () => ({ type: 'checkout.session.completed', livemode: true, data: { object: { id: f.session.id } } })) } };
  const run = () => fulfillPaidPlanWebhook(f.session, stripe, admin, 1700000500);
  const source = fs.readFileSync('supabase/functions/stripe-access-extension-webhook/index.ts', 'utf8').replace(/^import .*$/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  let handler!: (req: Request) => Promise<Response>;
  const StripeMock: any = function () { return stripe; };
  StripeMock.createSubtleCryptoProvider = () => ({});
  new Function('Stripe', 'createClient', 'validatePaidAccessExtension', 'fulfillPaidPlanWebhook', 'Deno', 'console', compiled)(
    StripeMock, () => admin, vi.fn(() => ({ ok: false })),
    (session: any, provider: any, client: any) => fulfillPaidPlanWebhook(session, provider, client, 1700000500),
    { env: { get: () => 'isolated' }, serve: (callback: typeof handler) => { handler = callback; } }, { error: vi.fn() });
  const request = (signature = 'valid-fixture') => new Request('https://isolated.test', { method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {}, body: '{"signed":"payload"}' });
  return { ...f, intent, ledger, term, rpc, admin, stripe, run, handler, request };
}

describe('signed checkout delivery activates ordinary paid packages without a return page', () => {
  it.each(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])('fulfills a verified %s delivery', async type => {
    const a = app();
    a.stripe.webhooks.constructEventAsync.mockResolvedValue({ type, livemode: true, data: { object: { id: a.session.id } } });
    const result = await a.handler(a.request());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ received: true, fulfillment: 'fulfilled' });
    expect(a.rpc).toHaveBeenCalledWith('fulfill_paid_plan_purchase', expect.objectContaining({
      _user_id: owner, _stripe_session_id: a.session.id, _payment_reference_at: a.ledger.payment_reference_at }));
    expect(a.stripe.webhooks.constructEventAsync).toHaveBeenCalledWith('{"signed":"payload"}', 'valid-fixture', 'isolated', undefined, {});
  });
  it('replays the immutable ledger without needing an old provider event', async () => {
    const a = app({ replay: true });
    expect(await a.run()).toEqual({ received: true, fulfillment: 'already_fulfilled' });
    expect(a.stripe.events.list).not.toHaveBeenCalled();
  });
  it('does not grant access while a delayed payment is unpaid', async () => {
    const a = app(); a.session.payment_status = 'unpaid';
    expect(await a.run()).toEqual({ received: true, pending: true });
    expect(a.rpc).not.toHaveBeenCalled();
  });
  it.each(['suspended', 'missing-consent', 'refunded', 'disputed', 'test-mode', 'wrong-amount', 'foreign-intent', 'missing-event', 'ledger-error', 'invalid-term'])('refuses %s without acknowledging fulfillment', async kind => {
    const a = app({ blocked: kind === 'suspended', ledgerError: kind === 'ledger-error', invalidResult: kind === 'invalid-term' });
    if (kind === 'missing-consent') a.session.metadata.purchase_consent = '';
    if (kind === 'refunded') a.charge.refunded = true;
    if (kind === 'disputed') a.charge.disputed = true;
    if (kind === 'test-mode') a.session.livemode = false;
    if (kind === 'wrong-amount') a.session.amount_total = 1;
    if (kind === 'foreign-intent') a.charge.payment_intent = 'pi_Foreign';
    if (kind === 'missing-event') a.stripe.events.list.mockResolvedValue({ data: [], has_more: false });
    const result = await a.handler(a.request());
    expect(result.status).toBeGreaterThanOrEqual(400);
    if (kind !== 'invalid-term') expect(a.rpc).not.toHaveBeenCalledWith('fulfill_paid_plan_purchase', expect.anything());
  });
  it.each(['missing', 'invalid'])('rejects a %s signature before provider retrieval or database access', async kind => {
    const a = app();
    if (kind === 'invalid') a.stripe.webhooks.constructEventAsync.mockRejectedValue(new Error('signature invalid'));
    expect((await a.handler(a.request(kind === 'missing' ? '' : 'bad'))).status).toBe(400);
    expect(a.stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(a.rpc).not.toHaveBeenCalled();
  });
  it('does not consume promotion or other purchase-type events', async () => {
    const a = app(); Object.assign(a.session.metadata, { promotion_version: '1', promotion_reservation_id: 'isolated-promotion' });
    expect(await a.run()).toEqual({ received: true, ignored: true });
    expect(a.rpc).not.toHaveBeenCalled();
  });
  it('rejects an event/session mode mismatch', async () => {
    const a = app(); a.session.livemode = false;
    expect((await a.handler(a.request())).status).toBe(422);
    expect(a.rpc).not.toHaveBeenCalled();
  });
});

describe('customer purchase confirmation trigger',()=>{
  it('sends only after verified new-package activation using the authenticated account email',async()=>{
    const a=app();a.session.metadata.plan_purchase_purpose='new_plan';
    const send=vi.fn(async()=>({data:{accepted:true},error:null}));
    const lookup=vi.fn(async()=>({data:{user:{email:'owner@example.test',user_metadata:{first_name:'Jane'}}},error:null}));
    Object.assign(a.admin,{auth:{admin:{getUserById:lookup}},functions:{invoke:send}});
    expect(await a.run()).toEqual({received:true,fulfillment:'fulfilled'});
    expect(lookup).toHaveBeenCalledWith(owner);
    expect(send).toHaveBeenCalledWith('send-transactional-email',expect.objectContaining({body:expect.objectContaining({recipientEmail:'owner@example.test',templateName:'customer-package-purchase',idempotencyKey:'package-purchase-'+a.session.id,templateData:expect.objectContaining({plan:'Essential',credits:150,total:'AUD 218.90'})})}));
  });
  it('leaves a retryable webhook failure when confirmation acceptance fails after activation',async()=>{
    const a=app();a.session.metadata.plan_purchase_purpose='new_plan';
    Object.assign(a.admin,{auth:{admin:{getUserById:async()=>({data:{user:{email:'owner@example.test'}},error:null})}},functions:{invoke:async()=>({error:{message:'unavailable'}})}});
    await expect(a.run()).rejects.toThrow('Purchase confirmation acceptance is pending');
    expect(a.rpc).toHaveBeenCalledWith('fulfill_paid_plan_purchase',expect.anything());
  });
  it('never reaches email delivery for an unpaid checkout',async()=>{
    const a=app();a.session.metadata.plan_purchase_purpose='new_plan';a.session.payment_status='unpaid';
    const send=vi.fn();Object.assign(a.admin,{functions:{invoke:send}});
    expect(await a.run()).toEqual({received:true,pending:true});expect(send).not.toHaveBeenCalled();
  });
});
