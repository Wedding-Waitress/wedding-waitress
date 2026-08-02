// Public, rate-limited verification of a gallery password.
// The browser can no longer call verify_event_media_password directly:
// that RPC is service-role only and is reached exclusively through here.
//
// Privacy: we never log or store passwords, password hashes, raw IPs,
// public tokens or user agents. Only HMAC-SHA256 digests of the
// rate-limit identifiers (peppered with a server-only secret) are stored.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** HMAC-SHA256 of `value` using the server-only pepper. */
export async function hmacKey(pepper: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Trusted client IP. Only gateway-supplied headers are consulted — never the
 * request body or query string.
 */
export function trustedIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0]?.trim();
  return first || headers.get('cf-connecting-ip') || headers.get('x-real-ip') || 'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim().slice(0, 128) : '';

    if (!token || !deviceId) {
      return json({ ok: false }, 400);
    }

    const pepper = Deno.env.get('MEDIA_PASSWORD_RL_PEPPER');
    if (!pepper) return json({ ok: false }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Scope counters by event when the token resolves; otherwise fall back to a
    // token-derived scope so unknown tokens still can't be brute-forced.
    const { data: eventId } = await supabase.rpc('get_event_id_for_media_token', { _token: token });
    const scope = (eventId as string | null) || (await hmacKey(pepper, `tok:${token}`));

    const deviceKey = await hmacKey(pepper, `device:${scope}:${deviceId}`);
    const ipKey = await hmacKey(pepper, `ip:${scope}:${trustedIp(req.headers)}`);

    // 1. Enforce the limit BEFORE any bcrypt comparison.
    const { data: blockedFor, error: rlErr } = await supabase.rpc('check_media_password_rate_limit', {
      _device_key: deviceKey,
      _ip_key: ipKey,
    });
    if (rlErr) return json({ ok: false }, 500);
    if ((blockedFor as number) > 0) {
      return json({ ok: false, rateLimited: true, retryAfterSeconds: blockedFor }, 429);
    }

    // 2. Compare. Unknown tokens are treated exactly like a wrong password.
    let ok = false;
    if (eventId) {
      const { data, error } = await supabase.rpc('verify_event_media_password', {
        _token: token,
        _password: password,
      });
      ok = !error && data === true;
    }

    // 3. Record the outcome atomically.
    const { data: retryAfter } = await supabase.rpc('record_media_password_attempt', {
      _device_key: deviceKey,
      _ip_key: ipKey,
      _event_id: (eventId as string | null) ?? null,
      _success: ok,
    });

    if (ok) return json({ ok: true });

    const retry = (retryAfter as number) || 0;
    if (retry > 0) {
      return json({ ok: false, rateLimited: true, retryAfterSeconds: retry }, 429);
    }
    return json({ ok: false }, 200);
  } catch {
    return json({ ok: false }, 500);
  }
});
