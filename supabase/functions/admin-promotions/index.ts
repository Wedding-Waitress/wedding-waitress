import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
import { normalizePromotionCode, validatePromotionPercent } from '../_shared/promotionRules.ts';
import { authenticatePromotionRequest } from '../_shared/promotionRequestAuth.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type', 'Content-Type': 'application/json' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Owner authentication required.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    // Retrieve current identity, rather than authorizing using editable metadata.
    const { user } = await authenticatePromotionRequest(req);
    if (!isOwnerAdminEmail(user.email)) return reply({ error: 'Verified owner administrator required.' }, 403);
    const { data: owner, error: ownerError } = await caller.rpc('is_owner_admin');
    if (ownerError || owner !== true) return reply({ error: 'Owner administrator required.' }, 403);
    const body = await req.json();
    const grant = typeof body.admin_grant === 'string' ? body.admin_grant : '';
    const signature = typeof body.admin_grant_signature === 'string' ? body.admin_grant_signature : '';
    if (!grant || !signature || !service) return reply({ error: 'Recent administrator verification required.' }, 403);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${grant}|${service}`));
    const expected = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (signature.length !== expected.length || [...expected].reduce((difference, character, index) => difference | (character.charCodeAt(0) ^ signature.charCodeAt(index)), 0) !== 0) return reply({ error: 'Administrator verification required.' }, 403);
    let verified: { user_id?: string; exp?: number };
    try { verified = JSON.parse(atob(grant)); } catch { return reply({ error: 'Administrator verification required.' }, 403); }
    if (verified.user_id !== user.id || typeof verified.exp !== 'number' || !Number.isFinite(verified.exp) || verified.exp <= Date.now()) return reply({ error: 'Administrator verification expired.' }, 403);
    let payload: Record<string, unknown> = {};
    if (body.action === 'create') {
      let code: string, percent: number;
      try { code = normalizePromotionCode(body.code); percent = validatePromotionPercent(body.percent_off); }
      catch { return reply({ error: 'Enter a valid manual code and whole percentage from 1 to 100.' }, 400); }
      if (typeof body.campaign_name !== 'string' || !body.campaign_name.trim() || body.campaign_name.trim().length > 120) return reply({ error: 'Enter a campaign name of 1–120 characters.' }, 400);
      payload = { code, percent_off: percent, campaign_name: body.campaign_name.trim() };
    } else if (body.action === 'set_active') {
      if (typeof body.active !== 'boolean' || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) return reply({ error: 'Choose a valid campaign and status.' }, 400);
      payload = { id: body.id, active: body.active };
    } else if (body.action !== 'list') return reply({ error: 'Unsupported action.' }, 400);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc('admin_manage_promotion', { p_actor: user.id, p_action: body.action, p_payload: payload });
    if (error) return reply({ error: error.code === '23505' ? 'That promo code already exists.' : 'Promotion management is unavailable. No success is confirmed.' }, 503);
    return reply({ success: true, data });
  } catch { return reply({ error: 'Promotion management could not be confirmed.' }, 503); }
});
