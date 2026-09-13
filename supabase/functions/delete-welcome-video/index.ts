import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteStreamVideo, removeWelcomeVideos } from '../_shared/welcomeVideo.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    const { event_id } = await req.json();
    const account = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const token = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    if (!account || !token) throw new Error('Video service is unavailable');
    await removeWelcomeVideos(db, event_id, user.id, uid => deleteStreamVideo(uid, account, token));
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Video removal failed' }), { status: 400, headers });
  }
});
