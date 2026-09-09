import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkWelcomeVideo } from '../_shared/welcomeVideo.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    const { stream_uid, event_id } = await req.json();
    if (!/^[a-f0-9]{32}$/i.test(stream_uid)) throw new Error('Invalid video identifier');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    const result = await checkWelcomeVideo(db, event_id, user.id, stream_uid, Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!, Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN')!);
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Video status check failed' }), { status: 400, headers });
  }
});
