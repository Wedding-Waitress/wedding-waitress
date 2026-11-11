import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isOwnerAdminEmail } from "../_shared/owner-admin.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userEmail = claims.claims.email;
    const userId = claims.claims.sub as string;

    if (!isOwnerAdminEmail(userEmail)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_owner_admin');
    if (adminError || isAdmin !== true) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid code format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const sessionId = claims.claims.session_id;
    if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      return new Response(JSON.stringify({ error: 'Please sign in again before verifying.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: proof, error: proofError } = await admin.rpc('consume_admin_verification_code', {
      p_user: userId, p_session: sessionId, p_code_hash: await sha256Hex(code),
    });
    if (proofError) {
      console.error('Admin verification transaction failed');
      return new Response(JSON.stringify({ error: 'Verification unavailable. Please request a new code.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const expiry = Date.parse(proof?.expires_at || '');
    if (proof?.result !== 'verified' || !Number.isFinite(expiry) || expiry <= Date.now()) {
      const messages: Record<string, string> = {
        invalid_code: 'Invalid code', expired: 'Code expired. Please request a new one.',
        too_many_attempts: 'Too many attempts. Please request a new code.',
      };
      return new Response(JSON.stringify({ error: messages[proof?.result] || 'No active code. Please request a new one.' }), { status: proof?.result === 'too_many_attempts' ? 429 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const grant = { user_id: userId, session_id: sessionId, exp: expiry };
    const grantStr = btoa(JSON.stringify(grant));
    const signature = await sha256Hex(grantStr + '|' + serviceKey);

    return new Response(JSON.stringify({ success: true, grant: grantStr, signature }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-verify-otp error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
