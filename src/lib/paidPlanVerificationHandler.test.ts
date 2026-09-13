import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validatePaidPlanFulfillmentEvidence, validatePaidPlanLedgerReplayEvidence, PAID_PLAN_CATALOGUE_VERSION } from '../../supabase/functions/_shared/paidPlanFulfillmentEvidence';
import { findOriginalPaymentSuccessEvent } from '../../supabase/functions/_shared/originalPaymentSuccessEvent';
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const originalTime = 1700000400;
function fixture({ blocked = false, replay = false, invalidResult = false, unpaid = false } = {}) {
  vi.spyOn(Date, 'now').mockReturnValue(1700000500000);
  const session = { object: 'checkout.session', id: 'cs_live_Original1', livemode: true, mode: 'payment', status: 'complete',
    payment_status: unpaid ? 'unpaid' : 'paid', created: 1700000000, payment_intent: 'pi_Original1', currency: 'aud',
    amount_subtotal: 19900, amount_total: 21890, total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 1990 },
    metadata: { user_id: owner, plan_type: 'essential', catalogue_version: PAID_PLAN_CATALOGUE_VERSION,
      purchase_consent: 'explicit-v1', plan_purchase_purpose: 'renewal' },
    line_items: { has_more: false, data: [{ quantity: 1, amount_subtotal: 19900,
      price: { currency: 'aud', unit_amount: 19900, product: { id: 'prod_UOQhHcOhFdrhOs' } } }] } };
  const charge = { object: 'charge', id: 'ch_Original1', payment_intent: 'pi_Original1', livemode: true,
    status: 'succeeded', paid: true, captured: true, refunded: false, amount_refunded: 0, disputed: false,
    currency: 'aud', amount: 21890, created: 1700000002 };
  const intent = { object: 'payment_intent', id: 'pi_Original1', livemode: true, status: 'succeeded', latest_charge: charge,
    currency: 'aud', amount: 21890, amount_received: 21890, created: 1700000001 };
  const event = { id: 'evt_Original1', object: 'event', type: 'payment_intent.succeeded', livemode: true,
    created: originalTime, data: { object: { id: intent.id, status: 'succeeded' } } };
  const ledger = { user_id: owner, stripe_session_id: session.id, stripe_payment_intent_id: intent.id,
    plan_id: '78cdab0d-d81d-4757-b7cc-f210b8b30f47', purpose: 'renewal', currency: 'AUD',
    amount_subtotal_cents: 19900, amount_total_cents: 21890, catalogue_version: PAID_PLAN_CATALOGUE_VERSION,
    payment_reference_at: new Date(originalTime * 1000).toISOString() };
  const term = { result: replay ? 'already_fulfilled' : 'fulfilled', plan_id: ledger.plan_id,
    started_at: ledger.payment_reference_at, expires_at: '2024-11-14T22:20:00.000Z', status: 'active' };
  const rpc = vi.fn(async (name: string) => ({ data: name === 'is_account_suspension_blocked' ? blocked : invalidResult ? null : term, error: null }));
  const update = vi.fn(() => { throw new Error('Subscription UPDATE is forbidden in verification'); });
  const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), update,
    maybeSingle: vi.fn(async () => ({ data: replay ? ledger : null, error: null })) };
  const client = { rpc, from: vi.fn(() => query), auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { email: '' } } })) } },
    functions: { invoke: vi.fn(async () => ({ error: null })) } };
  const retrieveIntent = vi.fn(async () => intent);
  const listEvents = vi.fn(async () => ({ data: [event], has_more: false }));
  const stripe = { checkout: { sessions: { retrieve: vi.fn(async () => session) } },
    paymentIntents: { retrieve: retrieveIntent }, events: { list: listEvents } };
  const source = readFileSync('supabase/functions/verify-payment/index.ts', 'utf8').replace(/^import .*$/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  let handler!: (request: Request) => Promise<Response>;
  new Function('guardSuspendedCustomer', 'serve', 'Stripe', 'createClient', 'Deno', 'console',
    'validatePaidAccessExtension', 'validatePaidPlanFulfillmentEvidence', 'validatePaidPlanLedgerReplayEvidence', 'findOriginalPaymentSuccessEvent', compiled)(
    vi.fn(async () => null), (callback: typeof handler) => { handler = callback; }, function () { return stripe; },
    () => client, { env: { get: () => 'isolated-fixture' } }, { log: vi.fn(), error: vi.fn() }, vi.fn(),
    validatePaidPlanFulfillmentEvidence, validatePaidPlanLedgerReplayEvidence, findOriginalPaymentSuccessEvent);
  const request = () => new Request('https://isolated.test', { method: 'POST', body: JSON.stringify({ session_id: session.id }) });
  return { handler, request, client, rpc, update, session, charge, retrieveIntent, listEvents, ledger, term };
}
afterEach(() => vi.restoreAllMocks());
describe('actual paid-plan verification Edge handler with isolated provider/database adapters', () => {
  it('fulfills a missing subscription through the atomic RPC using original success time', async () => {
    const app = fixture();
    const response = await app.handler(app.request());
    expect(await response.json()).toMatchObject({ type: 'plan', status: 'active', expires_at: app.term.expires_at });
    expect(app.rpc).toHaveBeenCalledWith('fulfill_paid_plan_purchase', expect.objectContaining({
      _user_id: owner, _payment_reference_at: new Date(originalTime * 1000).toISOString(), _purpose: 'renewal', _is_live: true }));
    expect(app.update).not.toHaveBeenCalled();
  });
  it('replays recorded evidence after event retention without resetting dates or notifying twice', async () => {
    const app = fixture({ replay: true });
    vi.spyOn(Date, 'now').mockReturnValue(1710000000000);
    expect(await (await app.handler(app.request())).json()).toMatchObject({ expires_at: app.term.expires_at });
    expect(app.listEvents).not.toHaveBeenCalled();
    expect(app.client.functions.invoke).not.toHaveBeenCalled();
    expect(app.rpc).toHaveBeenCalledWith('fulfill_paid_plan_purchase', expect.objectContaining({ _payment_reference_at: app.ledger.payment_reference_at }));
  });
  it('checks the metadata owner hold even without an authenticated callback', async () => {
    const app = fixture({ blocked: true });
    expect(await (await app.handler(app.request())).json()).toMatchObject({ status: 'pending' });
    expect(app.retrieveIntent).not.toHaveBeenCalled();
    expect(app.rpc).not.toHaveBeenCalledWith('fulfill_paid_plan_purchase', expect.anything());
  });
  it('does not turn a null fulfillment result into success', async () => {
    const app = fixture({ invalidResult: true });
    expect(await (await app.handler(app.request())).json()).toMatchObject({ status: 'pending' });
    expect(app.client.functions.invoke).not.toHaveBeenCalled();
  });
  it('does not fulfill unpaid, unconsented, refunded or wrongly priced sessions', async () => {
    for (const kind of ['unpaid', 'unconsented', 'refunded', 'price']) {
      vi.restoreAllMocks();
      const app = fixture({ unpaid: kind === 'unpaid' });
      if (kind === 'unconsented') app.session.metadata.purchase_consent = '';
      if (kind === 'refunded') app.charge.refunded = true;
      if (kind === 'price') app.session.amount_subtotal = 15000;
      expect(await (await app.handler(app.request())).json()).toMatchObject({ status: 'pending' });
      expect(app.rpc).not.toHaveBeenCalledWith('fulfill_paid_plan_purchase', expect.anything());
      expect(app.update).not.toHaveBeenCalled();
    }
  });
});
