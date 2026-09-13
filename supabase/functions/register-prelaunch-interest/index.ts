import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { validatePrelaunchRegistration } from '../_shared/prelaunchRegistration.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  try {
    // Bound the body even when Content-Length is absent or untrusted.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Registration details are required.' }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if (part.done) break;
      length += part.value.length; if (length > 8192) { await reader.cancel(); return reply({ error: 'Registration is too large.' }, 413); } chunks.push(part.value); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let registration;
    try { registration = validatePrelaunchRegistration(JSON.parse(new TextDecoder().decode(bytes))); }
    catch { return reply({ error: 'Please enter valid registration details.' }, 400); }
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Only a keyed digest is retained, never the raw address. Global database
    // throttling also applies when a proxy address is missing or spoofed.
    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${key}:${source}`));
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false } });
    const { data, error } = await db.rpc('save_prelaunch_registration', { p_details: registration, p_source_hash: fingerprint });
    if (error || data?.saved !== true) return reply({ error: 'Registration could not be saved. Please try again later.' }, 503);
    // Identical response for first submission and duplicates; no account lookup,
    // Auth creation, verification email, promotion redemption or trial grant.
    return reply({ saved: true });
  } catch { return reply({ error: 'Registration could not be saved. Please try again later.' }, 503); }
});
