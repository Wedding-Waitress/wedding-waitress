import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
export const promotionHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type', 'Content-Type': 'application/json' };
export const promotionReply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: promotionHeaders });
export async function authenticatePromotionRequest(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token || token === req.headers.get('Authorization')) throw new Error('Verified account session required.');
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
  const identity = await caller.auth.getUser(token);
  const claims = await caller.auth.getClaims(token);
  const user = identity.data.user;
  if (identity.error || claims.error || !user || user.is_anonymous || !user.email_confirmed_at || !user.email
    || claims.data?.claims.sub !== user.id || typeof claims.data.claims.session_id !== 'string') throw new Error('Verified account session required.');
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const hold = await db.rpc('is_prelaunch_access_blocked', { p_user_id: user.id });
  if (hold.error || hold.data !== false) throw new Error('Pre-launch access is not open.');
  const session = await db.rpc('promotion_session_active', { p_user: user.id, p_session: claims.data.claims.session_id });
  if (session.error || session.data !== true) throw new Error('Current account session required.');
  return { user, db };
}
