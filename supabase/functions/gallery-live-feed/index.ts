// Public edge function for the gallery Live View.
// Returns approved+uploaded items for a valid, open gallery token,
// each with a short-lived signed URL from the private event-media bucket.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // If the gallery is password-protected, require a correct password.
    const { data: pwOk, error: pwErr } = await supabase.rpc('verify_event_media_password', {
      _token: token,
      _password: password,
    });
    if (pwErr) {
      return new Response(JSON.stringify({ error: pwErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (pwOk !== true) {
      return new Response(JSON.stringify({ error: 'password required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY DEFINER RPC enforces: valid token, not expired, gallery is_open=true,
    // upload_status='uploaded', moderation_status='approved'. Hidden items never returned.
    const { data: rows, error } = await supabase.rpc('get_event_media_items_public', { _token: token });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = (rows || []) as Array<{
      id: string;
      kind: 'photo' | 'video';
      mime_type: string;
      storage_path: string;
      duration_sec: number | null;
      uploader_name: string | null;
      caption: string | null;
      uploaded_at: string | null;
    }>;

    let signed: Array<typeof items[number] & { signed_url: string }> = [];
    if (items.length > 0) {
      const paths = items.map((r) => r.storage_path);
      const { data: signs, error: signErr } = await supabase
        .storage
        .from('event-media')
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (signErr) {
        return new Response(JSON.stringify({ error: signErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const map = new Map<string, string>();
      (signs || []).forEach((s) => {
        if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
      });
      signed = items
        .map((r) => ({ ...r, signed_url: map.get(r.storage_path) || '' }))
        .filter((r) => r.signed_url.length > 0);
    }

    return new Response(
      JSON.stringify({ items: signed, ttl: SIGNED_URL_TTL_SECONDS }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
