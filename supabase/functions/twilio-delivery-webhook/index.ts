// Twilio Status Callback webhook — Smart RSVP delivery tracking.
// Validates X-Twilio-Signature, normalises status, and persists into
// sms_send_logs via the SECURITY DEFINER RPC `update_sms_delivery_status`.
//
// Public endpoint (verify_jwt = false). Twilio cannot send Supabase JWTs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const maskPhone = (p: string | null) => {
  if (!p) return "****";
  const t = p.replace(/\s+/g, "");
  if (t.length < 4) return "****";
  return `${t.slice(0, 3)}***${t.slice(-2)}`;
};

// Map Twilio MessageStatus → internal sms_delivery_status enum.
function normaliseStatus(twilio: string, errorCode: string | null): string {
  const s = (twilio || "").toLowerCase();
  // Twilio "blocked" patterns: 30004 (blocked), 30005 (unknown destination),
  // 30006 (landline/unreachable), 21610 (STOP unsubscribed).
  const blockedCodes = new Set(["30004", "30005", "30006", "21610"]);
  if (errorCode && blockedCodes.has(errorCode)) return "blocked";
  switch (s) {
    case "queued": return "queued";
    case "accepted":
    case "scheduled":
    case "sending":
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "undelivered": return "undelivered";
    case "failed": return "failed";
    default: return s || "queued";
  }
}

function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  // Twilio signature: HMAC-SHA1(authToken, url + sorted concat(key+value)) base64.
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  // constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("[twilio-delivery-webhook] TWILIO_AUTH_TOKEN not configured");
    return new Response("Server not configured", { status: 500, headers: corsHeaders });
  }

  // Read raw form body and parse manually so we can also reuse params for signature validation.
  const rawBody = await req.text();
  const formParams: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) formParams[k] = v;

  const signature = req.headers.get("x-twilio-signature") || "";
  // Twilio computes the signature against the public URL it called.
  // We honour x-forwarded-proto/host so signature matches the URL Twilio used.
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const path = new URL(req.url).pathname + new URL(req.url).search;
  const url = `${proto}://${host}${path}`;

  const valid = signature
    ? validateTwilioSignature(authToken, url, formParams, signature)
    : false;
  if (!valid) {
    console.warn("[twilio-delivery-webhook] invalid signature", {
      sid: formParams.MessageSid,
      to: maskPhone(formParams.To),
    });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  const messageSid = formParams.MessageSid || formParams.SmsSid || null;
  const twilioStatus = formParams.MessageStatus || formParams.SmsStatus || "";
  const errorCode = formParams.ErrorCode || null;
  const errorMessage = formParams.ErrorMessage || null;

  if (!messageSid) {
    return new Response("Missing MessageSid", { status: 400, headers: corsHeaders });
  }

  const internal = normaliseStatus(twilioStatus, errorCode);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("update_sms_delivery_status", {
    _twilio_sid: messageSid,
    _status: internal,
    _error_code: errorCode,
    _error_message: errorMessage,
    _raw_status: twilioStatus,
    _payload: formParams,
  });

  if (error) {
    console.error("[twilio-delivery-webhook] RPC error", error, { sid: messageSid, status: internal });
    // Always 200 to Twilio — internal failure logged, retries will follow if Twilio decides.
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (!data) {
    console.warn("[twilio-delivery-webhook] unknown SID (no row updated)", {
      sid: messageSid,
      status: internal,
      to: maskPhone(formParams.To),
    });
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});
