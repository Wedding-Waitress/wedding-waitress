// Centralized SMS sending service for Wedding Waitress.
// - Uses TWILIO_MESSAGING_SERVICE_SID primary; falls back to TWILIO_PHONE_NUMBER.
// - Atomic credit check + consume via SECURITY DEFINER RPCs.
// - Writes audit log to sms_send_logs.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SmsSendInput {
  user_id: string;
  event_id: string;
  guest_id: string | null;
  to: string;
  body: string;
}

export interface SmsSendResult {
  ok: boolean;
  status: "sent" | "failed" | "blocked";
  twilio_sid?: string;
  error?: string;
}

export const maskPhone = (raw: string): string => {
  const t = (raw || "").replace(/\s+/g, "");
  if (t.length < 4) return "****";
  return `${t.slice(0, 3)}***${t.slice(-2)}`;
};

export function getAdminSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

export async function getRemainingCredits(
  admin: SupabaseClient,
  user_id: string,
  event_id: string
): Promise<number> {
  const { data, error } = await admin.rpc("get_sms_credits", {
    _user_id: user_id,
    _event_id: event_id,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return Number(row?.remaining ?? 0);
}

export async function sendSmsAndAccount(
  admin: SupabaseClient,
  input: SmsSendInput
): Promise<SmsSendResult> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const phone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!sid || !token || (!messagingServiceSid && !phone)) {
    const err = "SMS provider not configured";
    await admin.rpc("log_sms_send", {
      _user_id: input.user_id,
      _event_id: input.event_id,
      _guest_id: input.guest_id,
      _to_masked: maskPhone(input.to),
      _twilio_sid: null,
      _status: "failed",
      _error: err,
    });
    return { ok: false, status: "failed", error: err };
  }

  // Pre-check: credit must be available
  const remaining = await getRemainingCredits(admin, input.user_id, input.event_id);
  if (remaining <= 0) {
    await admin.rpc("log_sms_send", {
      _user_id: input.user_id,
      _event_id: input.event_id,
      _guest_id: input.guest_id,
      _to_masked: maskPhone(input.to),
      _twilio_sid: null,
      _status: "blocked",
      _error: "No SMS credits remaining",
    });
    return { ok: false, status: "blocked", error: "No SMS credits remaining" };
  }

  // Send via Twilio REST API
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams();
  form.append("To", input.to);
  form.append("Body", input.body);
  if (messagingServiceSid) {
    form.append("MessagingServiceSid", messagingServiceSid);
  } else if (phone) {
    form.append("From", phone);
  }

  let twilioSid: string | undefined;
  let errorMessage: string | undefined;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const json = await res.json();
    if (res.ok && json?.sid) {
      twilioSid = json.sid as string;
    } else {
      errorMessage = json?.message || `Twilio error ${res.status}`;
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
  }

  if (!twilioSid) {
    await admin.rpc("log_sms_send", {
      _user_id: input.user_id,
      _event_id: input.event_id,
      _guest_id: input.guest_id,
      _to_masked: maskPhone(input.to),
      _twilio_sid: null,
      _status: "failed",
      _error: errorMessage ?? "Unknown Twilio error",
    });
    return { ok: false, status: "failed", error: errorMessage };
  }

  // Atomic post-success credit deduction
  const { data: consumed, error: consumeErr } = await admin.rpc("consume_sms_credit", {
    _user_id: input.user_id,
    _event_id: input.event_id,
    _guest_id: input.guest_id,
    _twilio_sid: twilioSid,
  });
  if (consumeErr) {
    console.error("[sms-service] consume_sms_credit failed", consumeErr);
  }

  await admin.rpc("log_sms_send", {
    _user_id: input.user_id,
    _event_id: input.event_id,
    _guest_id: input.guest_id,
    _to_masked: maskPhone(input.to),
    _twilio_sid: twilioSid,
    _status: "sent",
    _error: consumed ? null : "credit_not_deducted",
  });

  return { ok: true, status: "sent", twilio_sid: twilioSid };
}
