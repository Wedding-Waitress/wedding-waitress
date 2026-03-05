import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "ww-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing code parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Resolve the dynamic QR code
    const { data, error } = await supabase.rpc("resolve_dynamic_qr", {
      _code: code,
    });

    if (error || !data || data.length === 0) {
      return new Response(
        `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wedding Waitress</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;color:#333}
.card{text-align:center;padding:2rem;max-width:400px;background:#fff;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#7248e6;font-size:1.5rem}p{color:#666;line-height:1.6}</style></head>
<body><div class="card"><h1>💍 Wedding Waitress</h1><p>This QR code is not currently linked to an active event. Please check with your event host.</p></div></body></html>`,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    const result = data[0];
    const { qr_code_id, event_slug, destination_type, event_id } = result;

    // Log scan asynchronously (don't block redirect)
    const userAgent = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const referrer = req.headers.get("referer") || null;
    const ipHash = await hashIP(ip);

    // Fire and forget scan log
    supabase
      .from("qr_scan_logs")
      .insert({
        qr_code_id,
        event_id,
        user_agent: userAgent.slice(0, 500),
        ip_hash: ipHash,
        referrer: referrer?.slice(0, 500) || null,
      })
      .then(() => {});

    // Build redirect URL
    if (!event_slug) {
      return new Response(
        `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wedding Waitress</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;color:#333}
.card{text-align:center;padding:2rem;max-width:400px;background:#fff;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#7248e6;font-size:1.5rem}p{color:#666;line-height:1.6}</style></head>
<body><div class="card"><h1>💍 Wedding Waitress</h1><p>This QR code is active but no event is currently assigned. Please check with your event host.</p></div></body></html>`,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Use the app's public URL — hardcode fallback so QR redirects always work
    const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://weddingwaitress.com";

    let redirectPath: string;
    if (destination_type === "kiosk") {
      redirectPath = `/kiosk/${event_slug}`;
    } else {
      redirectPath = `/s/${event_slug}`;
    }

    const redirectUrl = `${publicBaseUrl}${redirectPath}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    });
  } catch (err) {
    console.error("qr-redirect error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
