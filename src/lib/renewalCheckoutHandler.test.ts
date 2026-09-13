import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { isMinimalConsentedRenewalRequest, isVerifiedClosedRenewalDecision } from '../../supabase/functions/_shared/renewalRecoveryRules';
import { PAID_PLAN_CATALOGUE_VERSION, PAID_PLAN_LIVE_CHECKOUT_ENABLED } from '../../supabase/functions/_shared/paidPlanFulfillmentEvidence';
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const body = { plan_type: 'essential', purchase_consent: true, plan_purchase_purpose: 'renewal', pricing_currency: 'AUD', mode: 'payment', ui_mode: 'embedded' };
function fixture({ status = 'closed', held = false, master = false, retainedMaster = true,
  decisionValid = true, authenticated = true, liveKey = false } = {}) {
  const rpc = vi.fn(async (name: string) => ({ data: name === 'is_account_operational' ? status !== 'closed'
    : name === 'is_account_master' ? master : name === 'get_my_customer_entitlement' ? { status }
    : { account_closed: true, admin_blocked: false, renewal_required: decisionValid, can_reopen: !decisionValid,
      server_now: '2026-09-12T08:00:00Z' }, error: null }));
  const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), not: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: retainedMaster ? { id: 'original-master' } : null, error: null })) };
  const client = { rpc, from: vi.fn(() => query), auth: { getUser: vi.fn(async () => ({
    data: { user: authenticated ? { id: owner, email: 'owner@isolated.test' } : null }, error: null })) } };
  const createSession = vi.fn(async () => ({ id: 'cs_test_Isolated', client_secret: 'isolated-client-secret' }));
  const createCustomer = vi.fn();
  const stripe = { customers: { list: vi.fn(async () => ({ data: [{ id: 'cus_Isolated' }] })), create: createCustomer },
    checkout: { sessions: { create: createSession } } };
  const guard = vi.fn(async () => held ? new Response('held', { status: 403 }) : null);
  const env: Record<string, string> = { SUPABASE_URL: 'https://isolated.test', SUPABASE_ANON_KEY: 'isolated-public',
    SUPABASE_SERVICE_ROLE_KEY: 'isolated-service', STRIPE_SECRET_KEY: liveKey ? 'sk_live_Isolated' : 'sk_test_Isolated',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_Isolated' };
  let handler!: (request: Request) => Promise<Response>;
  const source = readFileSync('supabase/functions/create-checkout/index.ts', 'utf8').replace(/^import .*$/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  new Function('guardSuspendedCustomer', 'serve', 'Stripe', 'createClient', 'Deno', 'console',
    'PAID_PLAN_CATALOGUE_VERSION', 'PAID_PLAN_LIVE_CHECKOUT_ENABLED', 'isMinimalConsentedRenewalRequest', 'isVerifiedClosedRenewalDecision', compiled)(
    guard, (callback: typeof handler) => { handler = callback; }, function () { return stripe; }, () => client,
    { env: { get: (name: string) => env[name] } }, { log: vi.fn(), error: vi.fn() }, PAID_PLAN_CATALOGUE_VERSION,
    PAID_PLAN_LIVE_CHECKOUT_ENABLED, isMinimalConsentedRenewalRequest, isVerifiedClosedRenewalDecision);
  const request = (changes = {}) => new Request('https://isolated.test', { method: 'POST',
    headers: { Authorization: 'Bearer isolated-session', origin: 'http://localhost:8080' }, body: JSON.stringify({ ...body, ...changes }) });
  return { handler, request, rpc, query, guard, createSession, createCustomer, client };
}
describe('actual minimal renewal checkout handler with isolated adapters', () => {
  it('permits a verified expired ordinary-closed original master without restoring planning membership', async () => {
    const app = fixture();
    expect((await app.handler(app.request())).status).toBe(200);
    expect(app.guard).toHaveBeenCalledWith(expect.any(Request), { allowEntitlementRecovery: true });
    expect(app.query.eq).toHaveBeenCalledWith('account_owner_id', owner);
    expect(app.query.eq).toHaveBeenCalledWith('member_user_id', owner);
    expect(app.query.eq).toHaveBeenCalledWith('role', 'master');
    expect(app.query.not).toHaveBeenCalledWith('accepted_at', 'is', null);
    expect(app.createSession).toHaveBeenCalledWith(expect.objectContaining({ mode: 'payment',
      metadata: expect.objectContaining({ user_id: owner, purchase_consent: 'explicit-v1', plan_purchase_purpose: 'renewal', catalogue_version: PAID_PLAN_CATALOGUE_VERSION }) }), undefined);
    expect(app.rpc).not.toHaveBeenCalledWith('reactivate_my_account', expect.anything());
    expect(app.createCustomer).not.toHaveBeenCalled();
  });
  it.each(['paid_expired', 'trial_expired'])('permits %s only for an actual active original master', async (status) => {
    const app = fixture({ status, master: true });
    expect((await app.handler(app.request())).status).toBe(200);
    expect(app.client.from).not.toHaveBeenCalled();
  });
  it.each([{ held: true }, { status: 'admin_blocked' }, { status: 'access_unavailable' }, { status: 'active' },
    { retainedMaster: false }, { decisionValid: false }, { status: 'paid_expired', master: false }])('denies restricted or unsupported renewal %j before provider checkout', async (options) => {
    const app = fixture(options);
    expect((await app.handler(app.request())).status).toBe(403);
    expect(app.createSession).not.toHaveBeenCalled();
  });
  it('fails closed on a missing Auth user before dereferencing identity', async () => {
    const app = fixture({ authenticated: false });
    expect((await app.handler(app.request())).status).toBe(401);
    expect(app.rpc).not.toHaveBeenCalled();
    expect(app.createSession).not.toHaveBeenCalled();
  });
  it('never creates a live package checkout while separate live activation is unapproved', async () => {
    const app = fixture({ liveKey: true });
    expect((await app.handler(app.request())).status).toBe(503);
    expect(app.createSession).not.toHaveBeenCalled();
  });
  it('does not apply an expiry exception to an add-on disguised as renewal', async () => {
    const app = fixture();
    expect((await app.handler(app.request({ purchase_type: 'communication_topup' }))).status).toBe(403);
    expect(app.guard).toHaveBeenCalledWith(expect.any(Request), { allowEntitlementRecovery: false });
    expect(app.createSession).not.toHaveBeenCalled();
  });
});
