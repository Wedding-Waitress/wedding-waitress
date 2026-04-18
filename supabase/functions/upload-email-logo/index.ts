// One-off helper to upload the brown logo to Supabase Storage `email-assets` bucket.
// Invoke with: { "base64": "<png-base64>" }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { base64 } = await req.json();
    if (!base64) return new Response(JSON.stringify({ error: "missing base64" }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Ensure bucket exists (public)
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.id === "email-assets")) {
      const { error: bErr } = await supabase.storage.createBucket("email-assets", { public: true });
      if (bErr) console.log("bucket create:", bErr.message);
    }

    // Decode base64 -> bytes
    const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { error: upErr } = await supabase.storage
      .from("email-assets")
      .upload("wedding-waitress-logo-brown.png", bin, {
        contentType: "image/png",
        upsert: true,
      });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage
      .from("email-assets")
      .getPublicUrl("wedding-waitress-logo-brown.png");

    return new Response(JSON.stringify({ ok: true, url: pub.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
