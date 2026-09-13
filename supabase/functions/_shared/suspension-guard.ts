import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

/** Apply before any customer planning handler uses service-role access.
 * This guard adds no permissions: the handler still validates all existing
 * ownership, public-token, processor-secret and provider-signature rules. */
export async function guardSuspendedCustomer(req: Request, options: { allowEntitlementRecovery?: boolean } = {}): Promise<Response | null> {
  if (req.method === 'OPTIONS') return null;
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!token || (serviceKey && token === serviceKey)) return null;
  // Public/publishable keys are not user sessions. Unverified decoding is used
  // ONLY to select the Auth verification path, never as an authorization grant.
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role !== 'authenticated') return null;
  } catch { return null; }
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') || '', serviceKey, { auth: { persistSession: false } });
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers });
    const { data: prelaunchBlocked, error: prelaunchError } = await client.rpc('is_prelaunch_access_blocked', { p_user_id: user.id });
    if (prelaunchError) throw prelaunchError;
    if (prelaunchBlocked !== false) return new Response(JSON.stringify({ error: 'Wedding Waitress is launching soon. Planning access is not open yet.' }), { status: 403, headers });
    const { data: blocked, error: accessError } = await client.rpc('is_account_suspension_blocked', { p_user_id: user.id });
    if (accessError) throw accessError;
    if (blocked !== false) return new Response(JSON.stringify({ error: 'Account planning access is unavailable.' }), { status: 403, headers });
    // Only a separately verified billing-recovery handler may opt out of the
    // expiry check. That option never bypasses administrative account holds.
    if (!options.allowEntitlementRecovery) {
      const { data: entitlementBlocked, error: entitlementError } = await client.rpc('is_customer_entitlement_blocked', { p_user_id: user.id });
      if (entitlementError) throw entitlementError;
      if (entitlementBlocked !== false) return new Response(JSON.stringify({ error: 'Your original access period has ended or account access is restricted.' }), { status: 403, headers });
    }
    return null;
  } catch {
    return new Response(JSON.stringify({ error: 'Account access could not be verified.' }), { status: 503, headers });
  }
}
