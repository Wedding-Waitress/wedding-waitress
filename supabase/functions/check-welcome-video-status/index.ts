import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stream_uid, event_id } = await req.json();
    
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
      throw new Error("Cloudflare credentials not configured");
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Checking video status for stream UID:", stream_uid);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${stream_uid}`,
      {
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
        },
      }
    );

    if (!cfResponse.ok) {
      const cfError = await cfResponse.text();
      console.error("Cloudflare status check error:", cfError);
      throw new Error("Failed to check video status");
    }

    const cfData = await cfResponse.json();
    const videoData = cfData.result;

    console.log("Video status:", videoData.status?.state);

    const status = videoData.status?.state === "ready" ? "ready" : 
                   videoData.status?.state === "error" ? "error" : 
                   "processing";

    const playbackUrl = videoData.status?.state === "ready" 
      ? `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${stream_uid}/iframe`
      : null;

    const { error: updateError } = await supabase
      .from("welcome_video_uploads")
      .update({
        status,
        cloudflare_playback_url: playbackUrl,
        duration_seconds: videoData.duration,
        updated_at: new Date().toISOString(),
      })
      .eq("cloudflare_uid", stream_uid)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Database update error:", updateError);
    }

    if (status === "ready" && playbackUrl) {
      const { error: moduleError } = await supabase
        .from("live_view_module_settings")
        .upsert({
          event_id,
          welcome_video_config: {
            video_url: playbackUrl,
          },
        }, {
          onConflict: "event_id",
        });

      if (moduleError) {
        console.error("Module settings update error:", moduleError);
      }
    }

    return new Response(
      JSON.stringify({
        status,
        playback_url: playbackUrl,
        duration_seconds: videoData.duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
