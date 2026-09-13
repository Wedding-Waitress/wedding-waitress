import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
import { readAdminBilling } from '../_shared/adminReadOnlyBilling.ts';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedKeys = new Set(['customer_id', 'cursor', 'admin_grant', 'admin_grant_signature']);

/** Audited owner support only. Provider calls are GETs using a dedicated restricted key. */
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Administrator authentication required' }, 401);
    const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) return reply({ error: 'Read-only billing is unavailable' }, 503);
    const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: identity, error: identityError } = await caller.auth.getUser(authorization.slice(7));
    if (identityError || !identity.user || identity.user.is_anonymous || !isOwnerAdminEmail(identity.user.email)) return reply({ error: 'Administrator access denied' }, 403);
    const { data: owner, error: ownerError } = await caller.rpc('is_owner_admin');
    if (ownerError || owner !== true) return reply({ error: 'Administrator access denied' }, 403);
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowedKeys.has(key))
      || typeof body.customer_id !== 'string' || !uuid.test(body.customer_id)
      || body.cursor !== undefined && (typeof body.cursor !== 'string' || !/^in_[A-Za-z0-9]+$/.test(body.cursor))) return reply({ error: 'Invalid read-only billing request' }, 400);
    const grant = body.admin_grant, signature = body.admin_grant_signature;
    if (typeof grant !== 'string' || typeof signature !== 'string' || !grant || !signature) return reply({ error: 'Recent administrator verification required' }, 403);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${grant}|${service}`));
    const expected = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (signature !== expected) return reply({ error: 'Recent administrator verification required' }, 403);
    let verified: { user_id?: unknown; exp?: unknown };
    try { verified = JSON.parse(atob(grant)); } catch { return reply({ error: 'Invalid administrator verification' }, 403); }
    if (verified.user_id !== identity.user.id || typeof verified.exp !== 'number' || !Number.isFinite(verified.exp) || verified.exp <= Date.now()) return reply({ error: 'Administrator verification expired' }, 403);
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: customer, error: customerError } = await admin.auth.admin.getUserById(body.customer_id);
    if (customerError || !customer.user?.email) return reply({ error: 'Customer billing ownership is unavailable' }, 404);
    const { error: auditError } = await admin.from('admin_action_audit').insert({ administrator_id: identity.user.id, action: 'view_customer_billing', target_type: 'account', target_id: body.customer_id,
      reason: 'Read-only owner support billing preview', previous_state: {}, new_state: { read_only: true, provider_get_only: true }, result: 'succeeded' });
    if (auditError) throw new Error('Audit unavailable');
    const restricted = Deno.env.get('STRIPE_READ_ONLY_KEY');
    // No fallback to a broad secret key and no fabricated empty transaction history.
    if (!restricted || !/^rk_(test|live)_[A-Za-z0-9]+$/.test(restricted)) return reply({ state: 'provider_unavailable', read_only: true, ownerId: body.customer_id });
    const list = async (resource: string, input: Record<string, string | number>) => {
      const query = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
      const response = await fetch(`https://api.stripe.com/v1/${resource}?${query}`, { method: 'GET', headers: { Authorization: `Bearer ${restricted}`, 'Stripe-Version': '2026-07-29.dahlia' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Provider read unavailable');
      const result = await response.json();
      if (!Array.isArray(result.data) || typeof result.has_more !== 'boolean') throw new Error('Invalid provider list');
      return result;
    };
    const result = await readAdminBilling({ customers: { list: input => list('customers', input) }, paymentMethods: { list: input => list('payment_methods', input) }, invoices: { list: input => list('invoices', input) } }, body.customer_id, customer.user.email, body.cursor);
    return reply(result.state === 'available' ? result : { ...result, read_only: true, ownerId: body.customer_id });
  } catch {
    return reply({ error: 'Read-only billing could not be verified. No customer changes were made.' }, 503);
  }
});
