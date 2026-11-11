// Execute the actual Edge handlers/shared senders with in-memory database and
// provider adapters. No network or customer messages are permitted in this suite.
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

function load(file: string, deps: Record<string, unknown>) {
  const source = readFileSync(file, 'utf8').replace(/^import .*;?\r?\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', ...Object.keys(deps), js)(exports, ...Object.values(deps));
  return exports as Record<string, (...args: unknown[]) => unknown>;
}

function harness(options: { emailFail?: boolean; smsFail?: boolean; noConfig?: boolean; noMobile?: boolean; noEmail?: boolean; trackingFail?: boolean } = {}) {
  const state = { used: 0, status: 'not_sent', claims: new Set<string>(), updates: 0 };
  const event = { id: 'event', user_id: 'owner', name: 'Test Event', slug: 'test-event' };
  const guest = { id: 'guest', first_name: 'Test', last_name: 'Recipient', email: options.noEmail ? null : 'recipient@example.test', mobile: options.noMobile ? null : '0412 345 678', rsvp_invite_status: state.status };
  const provider = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes('resend.com')) return new Response(JSON.stringify(options.emailFail ? { message: 'test rejection' } : { id: 'email-provider-id' }), { status: options.emailFail ? 422 : 200 });
    expect(new URLSearchParams(String(init.body)).get('To')).toBe('+61412345678');
    return new Response(JSON.stringify(options.smsFail ? { code: 21211, message: 'test rejection' } : { sid: 'sms-provider-id' }), { status: options.smsFail ? 400 : 201 });
  });
  const db = {
    auth: { getClaims: async () => ({ data: { claims: { sub: 'owner' } }, error: null }) },
    rpc: vi.fn(async (name: string, args: Record<string, string>) => {
      if (name === 'is_account_operational') return { data: true };
      if (name === 'get_sms_credits') return { data: [{ total: 450, used: state.used, remaining: 450 - state.used }] };
      if (name === 'consume_communication_credit') { state.used++; return { data: true }; }
      if (name === 'restore_communication_credit') { state.used--; return {}; }
      if (name === 'acknowledge_email_acceptance') return { data: true };
      if (name === 'get_or_create_guest_invitation_token') return { data: 'T'.repeat(43), error: null };
      if (name === 'record_rsvp_acceptance') {
        if (options.trackingFail) return { error: { code: 'TEST_TRACKING_FAILURE' } };
        state.status = state.status !== 'not_sent' && state.status !== `${args._channel}_sent` ? 'both_sent' : `${args._channel}_sent`;
        state.updates++; return {};
      }
      return {};
    }),
    from(table: string) {
      let insert: Record<string, string> | undefined;
      const resolve = () => {
        if (insert && (table === 'email_send_log' || table === 'sms_send_logs')) {
          const key = insert.message_id || insert.delivery_id;
          if (state.claims.has(key)) return { error: { code: '23505' } };
          state.claims.add(key); return { data: { id: key } };
        }
        return { data: table === 'events' ? event : table === 'guests' ? [guest] : null, error: null };
      };
      const chain = {
        select: () => chain, eq: () => chain, in: () => chain,
        insert: (row: Record<string, string>) => { insert = row; return chain; },
        update: () => chain, single: async () => resolve(), maybeSingle: async () => resolve(),
        then: (callback: (value: unknown) => unknown) => Promise.resolve(resolve()).then(callback),
      };
      return chain;
    },
  };
  const env = { get: (name: string) => options.noConfig && /TWILIO|RESEND/.test(name) ? undefined : 'test-config' };
  const deps = { createClient: () => db, Deno: { env }, crypto: webcrypto, fetch: provider, console: { error: vi.fn() } };
  const sms = load('supabase/functions/_shared/sms-service.ts', deps);
  const email = load('supabase/functions/_shared/customer-email-data.ts', deps);
  const publicRsvpLink = load('supabase/functions/_shared/public-rsvp-link.ts', deps);
  const handlers: Record<string, (req: Request) => Promise<Response>> = {};
  for (const channel of ['email', 'sms']) {
    load(`supabase/functions/send-rsvp-${channel}/index.ts`, {
      ...deps, ...sms, ...email, ...publicRsvpLink, guardSuspendedCustomer: async () => null,
      Deno: { env, serve: (handler: (req: Request) => Promise<Response>) => { handlers[channel] = handler; } },
    });
  }
  const send = (channel: string, overrides: Record<string, unknown> = {}, auth = true) => handlers[channel](new Request('https://example.test', {
    method: 'POST', headers: auth ? { Authorization: 'Bearer test-session' } : {},
    body: JSON.stringify({ event_id: 'event', guest_ids: ['guest'], request_id: '123e4567-e89b-42d3-a456-426614174000', ...overrides }),
  }));
  return { state, provider, send, db };
}

describe('RSVP actual backend handlers with safe provider adapters', () => {
  it.each(['email', 'sms', 'both'])('%s accepts messages and charges one shared credit per accepted channel', async method => {
    const h = harness();
    const channels = method === 'both' ? ['email', 'sms'] : [method];
    const results = await Promise.all(channels.map(channel => h.send(channel)));
    for (const result of results) expect(await result.json()).toMatchObject({ sent: 1, failed: 0 });
    expect(h.state.used).toBe(channels.length);
    expect(h.state.status).toBe(method === 'both' ? 'both_sent' : `${method}_sent`);
  });
  it.each(['email', 'sms'])('%s rejection restores credit and never marks sent', async channel => {
    const h = harness({ emailFail: true, smsFail: true });
    expect((await h.send(channel)).status).toBe(502);
    expect(h.state.used).toBe(0); expect(h.state.updates).toBe(0);
  });
  it.each(['email', 'sms'])('partial success when %s rejects charges only the accepted channel', async failed => {
    const h = harness({ emailFail: failed === 'email', smsFail: failed === 'sms' });
    const responses = await Promise.all(['email', 'sms'].map(channel => h.send(channel)));
    expect(responses.map(r => r.status).sort()).toEqual([200, 502]);
    expect(h.state.used).toBe(1); expect(h.state.updates).toBe(1);
  });
  it.each(['email', 'sms'])('%s repeats never call the provider or charge twice', async channel => {
    const h = harness(); await h.send(channel); await h.send(channel);
    expect(h.provider).toHaveBeenCalledTimes(1); expect(h.state.used).toBe(1);
  });
  it.each(['email', 'sms'])('%s dry run checks the backend but sends and charges nothing', async channel => {
    const h = harness(); expect(await (await h.send(channel, { dry_run: true })).json()).toMatchObject({ dry_run: true, credits_used: 0 });
    expect(h.provider).not.toHaveBeenCalled(); expect(h.state.used).toBe(0);
  });
  it.each(['email', 'sms'])('%s rejects unauthenticated callers and reports missing configuration', async channel => {
    const h = harness({ noConfig: true }); expect((await h.send(channel, {}, false)).status).toBe(401);
    expect((await h.send(channel)).status).toBe(503); expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(['email', 'sms'])('%s skips missing contact details without charging', async channel => {
    const h = harness({ noEmail: true, noMobile: true });
    expect(await (await h.send(channel)).json()).toMatchObject({ sent: 0, skipped: 1 });
    expect(h.provider).not.toHaveBeenCalled(); expect(h.state.used).toBe(0);
  });
  it.each(['email', 'sms'])('%s preserves acceptance and credit when tracking fails', async channel => {
    const h = harness({ trackingFail: true });
    expect(await (await h.send(channel)).json()).toMatchObject({ sent: 1, tracking_pending: 1 });
    expect(h.state.used).toBe(1);
  });
});
