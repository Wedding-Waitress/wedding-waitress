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
    const { event_id, file_size } = await req.json();
    
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

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", event_id)
      .eq("user_id", user.id)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: "Event not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Creating Cloudflare Stream upload URL for event:", event_id);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(file_size || "524288000"),
          "Upload-Metadata": `maxDurationSeconds MTIw, name ${btoa("welcome-video")}`,
        },
      }
    );

    if (!cfResponse.ok) {
      const cfError = await cfResponse.text();
      console.error("Cloudflare error:", cfError);
      throw new Error("Failed to create upload URL");
    }

    const uploadUrl = cfResponse.headers.get("Location");
    const streamMediaId = cfResponse.headers.get("stream-media-id");

    if (!uploadUrl || !streamMediaId) {
      throw new Error("Invalid response from Cloudflare Stream");
    }

    console.log("Cloudflare upload URL created:", streamMediaId);

    const { error: dbError } = await supabase
      .from("welcome_video_uploads")
      .insert({
        event_id,
        user_id: user.id,
        cloudflare_uid: streamMediaId,
        status: "uploading",
      });

    if (dbError) {
      console.error("Database insert error:", dbError);
    }

    return new Response(
      JSON.stringify({
        upload_url: uploadUrl,
        stream_uid: streamMediaId,
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
