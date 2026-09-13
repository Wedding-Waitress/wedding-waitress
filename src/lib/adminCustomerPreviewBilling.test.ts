import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { readAdminBilling } from '../../supabase/functions/_shared/adminReadOnlyBilling';
const actor = '33333333-3333-4333-8333-333333333333', target = '11111111-1111-4111-8111-111111111111';
const source = readFileSync('supabase/functions/admin-customer-preview-billing/index.ts', 'utf8').replace(/^import .*$/gm, '');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function fixture({ owner = true, auditFailure = false, configured = true } = {}) {
  const insert = vi.fn(async () => ({ error: auditFailure ? new Error('private audit error') : null }));
  const getUserById = vi.fn(async () => ({ data: { user: { id: target, email: 'actual@example.test' } }, error: null }));
  const client = vi.fn((_url, key) => key === 'fixture-service' ? { auth: { admin: { getUserById } }, from: () => ({ insert }) }
    : { auth: { getUser: async () => ({ data: { user: { id: actor, email: 'owner@example.test', is_anonymous: false } }, error: null }) }, rpc: async () => ({ data: owner, error: null }) });
  const fetch = vi.fn(async (url: string) => new Response(JSON.stringify({ data: url.includes('/customers?') ? [{ id: 'cus_owned', livemode: false, metadata: { user_id: target } }] : [], has_more: false }), { status: 200 }));
  const env: Record<string, string> = { SUPABASE_URL: 'https://isolated.test', SUPABASE_ANON_KEY: 'fixture-publishable', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', ...(configured ? { STRIPE_READ_ONLY_KEY: ['rk', 'test', 'fixture'].join('_') } : {}) };
  let handler!: (req: Request) => Promise<Response>;
  new Function('createClient', 'isOwnerAdminEmail', 'readAdminBilling', 'Deno', 'crypto', 'fetch', compiled)(client, () => true, readAdminBilling, { env: { get: (name: string) => env[name] }, serve: (fn: typeof handler) => { handler = fn; } }, webcrypto, fetch);
  const grant = btoa(JSON.stringify({ user_id: actor, exp: Date.now() + 60000 }));
  const signature = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(`${grant}|fixture-service`))).toString('hex');
  const request = (patch: Record<string, unknown> = {}) => new Request('https://isolated.test', { method: 'POST', headers: { Authorization: 'Bearer fixture-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: target, admin_grant: grant, admin_grant_signature: signature, ...patch }) });
  return { handler, request, fetch, insert, getUserById };
}
describe('fresh verified audited readonly billing endpoint', () => {
  it('uses provider GET only after actual customer lookup and successful audit', async () => {
    const a = await fixture(); const response = await a.handler(a.request());
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ state: 'available', read_only: true, ownerId: target });
    expect(a.getUserById).toHaveBeenCalledWith(target); expect(a.insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'view_customer_billing', target_id: target }));
    for (const [url, options] of a.fetch.mock.calls as unknown as [string, RequestInit][]) { expect(url).toMatch(/^https:\/\/api\.stripe\.com\/v1\/(customers|payment_methods|invoices)\?/); expect(options.method).toBe('GET'); }
    expect(a.insert.mock.invocationCallOrder[0]).toBeLessThan(a.fetch.mock.invocationCallOrder[0]);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('denies ordinary administrators before customer/provider reads', async () => {
    const a = await fixture({ owner: false }); expect((await a.handler(a.request())).status).toBe(403); expect(a.getUserById).not.toHaveBeenCalled(); expect(a.fetch).not.toHaveBeenCalled();
  });
  it.each([{ admin_grant_signature: 'invalid' }, { customer_id: 'not-uuid' }, { portal: true }, { cursor: 'private-url' }])('rejects invalid grants or caller-selected actions (%j)', async patch => {
    const a = await fixture(); expect((await a.handler(a.request(patch))).status).toBeGreaterThanOrEqual(400); expect(a.fetch).not.toHaveBeenCalled();
  });
  it('fails closed without audit and sanitizes errors', async () => {
    const a = await fixture({ auditFailure: true }); const response = await a.handler(a.request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain('private audit'); expect(a.fetch).not.toHaveBeenCalled();
  });
  it('labels an absent read-only provider key unavailable rather than empty history', async () => {
    const a = await fixture({ configured: false }); const result = await (await a.handler(a.request())).json(); expect(result).toMatchObject({ state: 'provider_unavailable' }); expect(result).not.toHaveProperty('history'); expect(a.fetch).not.toHaveBeenCalled();
  });
});
