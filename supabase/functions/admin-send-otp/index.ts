import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'naderelalfy1977@gmail.com';

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
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userEmail = (claims.claims.email as string | undefined)?.toLowerCase();
    const userId = claims.claims.sub as string;

    if (userEmail !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from('profiles').select('mobile').eq('id', userId).maybeSingle();
    const rawPhone = profile?.mobile?.trim();
    if (!rawPhone) {
      return new Response(JSON.stringify({ error: 'Admin phone number required. Please add a mobile number in My Account.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Normalise to E.164. Default region: AU (+61). Strip spaces/dashes/parens first.
    const cleaned = rawPhone.replace(/[\s\-()]/g, '');
    let formattedPhone: string;
    if (cleaned.startsWith('+')) {
      formattedPhone = cleaned;
    } else if (cleaned.startsWith('00')) {
      formattedPhone = '+' + cleaned.slice(2);
    } else if (cleaned.startsWith('0')) {
      formattedPhone = '+61' + cleaned.slice(1);
    } else if (cleaned.startsWith('61')) {
      formattedPhone = '+' + cleaned;
    } else {
      formattedPhone = '+61' + cleaned;
    }

    console.log('TWILIO CHECK:', { sid: !!twilioSid, token: !!twilioToken, phone: !!twilioPhone });
    console.log('Sending SMS to:', formattedPhone);

    if (!twilioSid || !twilioToken || !twilioPhone) {
      return new Response(JSON.stringify({ error: 'SMS is not configured.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate previous unconsumed codes
    await admin.from('admin_otp_codes').update({ consumed_at: new Date().toISOString() }).eq('user_id', userId).is('consumed_at', null);

    const { error: insertErr } = await admin.from('admin_otp_codes').insert({
      user_id: userId, code_hash: codeHash, expires_at: expiresAt,
    });
    if (insertErr) {
      return new Response(JSON.stringify({ error: 'Failed to create code' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Send via Twilio
    const body = new URLSearchParams({
      To: formattedPhone,
      From: twilioPhone,
      Body: `Wedding Waitress Admin verification code: ${code}. Expires in 10 minutes.`,
    });
    const twResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!twResp.ok) {
      const t = await twResp.text();
      console.error('Twilio error', twResp.status, t);
      return new Response(JSON.stringify({ error: 'SMS failed. Check Twilio configuration or phone format.' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mask phone
    const masked = formattedPhone.replace(/.(?=.{4})/g, '*');
    return new Response(JSON.stringify({ success: true, masked_phone: masked }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-send-otp error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
