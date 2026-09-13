import { createClient } from 'npm:@supabase/supabase-js@2.57.2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Unauthenticated' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !user?.email) return json({ error: 'Unauthenticated' }, 401);
    const { confirmation, operation } = await req.json();
    // Old DELETE clients cannot silently convert an erasure acknowledgement into closure.
    if (operation !== 'ordinary_closure') return json({ error: 'Please refresh and review the current account closure terms.' }, 409);
    if (confirmation !== 'CLOSE' && (typeof confirmation !== 'string' || confirmation.trim().toLowerCase() !== user.email.toLowerCase())) {
      return json({ error: 'Confirmation text does not match' }, 400);
    }
    // SQL verifies recent signed AMR/auth_time, master ownership and holds.
    const { data, error } = await client.rpc('deactivate_my_account');
    if (error) {
      if (error.code === '42501') return json({ error: 'Closure requires a recently authenticated, unrestricted account owner.' }, 403);
      console.error('[CLOSE-ACCOUNT] Deactivation failed', { code: error.code });
      return json({ error: 'Account closure could not be completed. No success has been confirmed.' }, 503);
    }
    if (!data || data.status !== 'scheduled_for_deletion' || !data.ordinary_closed_at) return json({ error: 'Account closure could not be verified.' }, 503);
    return json({ success: true, lifecycle: data });
  } catch {
    return json({ error: 'Account closure could not be completed.' }, 500);
  }
});
