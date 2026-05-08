// Centralized SMS sending service for Wedding Waitress.
// - Uses TWILIO_MESSAGING_SERVICE_SID primary; falls back to TWILIO_PHONE_NUMBER.
// - Atomic credit check + consume via SECURITY DEFINER RPCs.
// - Writes audit log to sms_send_logs with delivery-status-ready transitions:
//     queued -> sent | failed | blocked
//   Future Twilio status-callback webhook will then update sent -> delivered | undelivered.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SmsSendInput {
  user_id: string;
  event_id: string;
  guest_id: string | null;
  to: string;
  body: string;
  /**
   * Campaign delivery method this SMS belongs to. Defaults to 'sms' (SMS-only
   * campaign). When the host chose 'both', pass 'both' so logs/analytics can
   * distinguish combined campaigns from SMS-only ones. 'email' is never used
   * here (no SMS would be sent), but accepted for type completeness.
   */
  delivery_method?: 'email' | 'sms' | 'both';
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

async function insertLog(
  admin: SupabaseClient,
  args: {
    user_id: string;
    event_id: string;
    guest_id: string | null;
    to_masked: string;
    twilio_sid: string | null;
    status: "queued" | "sent" | "failed" | "blocked";
    error?: string | null;
    delivery_method?: 'email' | 'sms' | 'both';
  }
): Promise<string | null> {
  const { data, error } = await admin.rpc("log_sms_send", {
    _user_id: args.user_id,
    _event_id: args.event_id,
    _guest_id: args.guest_id,
    _to_masked: args.to_masked,
    _twilio_sid: args.twilio_sid,
    _status: args.status,
    _error: args.error ?? null,
    _delivery_method: args.delivery_method ?? 'sms',
  });
  if (error) {
    console.error("[sms-service] log_sms_send failed", error);
    return null;
  }
  return (data as string) ?? null;
}

async function updateLog(
  admin: SupabaseClient,
  id: string,
  args: {
    status: "sent" | "failed" | "blocked" | "delivered" | "undelivered";
    twilio_sid?: string | null;
    error?: string | null;
    error_code?: string | null;
  }
): Promise<void> {
  const { error } = await admin.rpc("update_sms_log_status", {
    _id: id,
    _status: args.status,
    _twilio_sid: args.twilio_sid ?? null,
    _error: args.error ?? null,
    _error_code: args.error_code ?? null,
  });
  if (error) console.error("[sms-service] update_sms_log_status failed", error);
}

export async function sendSmsAndAccount(
  admin: SupabaseClient,
  input: SmsSendInput
): Promise<SmsSendResult> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const phone = Deno.env.get("TWILIO_PHONE_NUMBER");
  const masked = maskPhone(input.to);

  const dm = input.delivery_method ?? 'sms';

  if (!sid || !token || (!messagingServiceSid && !phone)) {
    const err = "SMS provider not configured";
    await insertLog(admin, {
      user_id: input.user_id,
      event_id: input.event_id,
      guest_id: input.guest_id,
      to_masked: masked,
      twilio_sid: null,
      status: "failed",
      error: err,
      delivery_method: dm,
    });
    return { ok: false, status: "failed", error: err };
  }

  // Pre-check: credit must be available. Failed/blocked sends NEVER consume
  // credits (consume_sms_credit is only called after a successful Twilio SID).
  const remaining = await getRemainingCredits(admin, input.user_id, input.event_id);
  if (remaining <= 0) {
    await insertLog(admin, {
      user_id: input.user_id,
      event_id: input.event_id,
      guest_id: input.guest_id,
      to_masked: masked,
      twilio_sid: null,
      status: "blocked",
      error: "No SMS credits remaining",
      delivery_method: dm,
    });
    return { ok: false, status: "blocked", error: "No SMS credits remaining" };
  }

  // 1. Insert queued log row first so Twilio webhook callbacks can match by SID later.
  const logId = await insertLog(admin, {
    user_id: input.user_id,
    event_id: input.event_id,
    guest_id: input.guest_id,
    to_masked: masked,
    twilio_sid: null,
    status: "queued",
    delivery_method: dm,
  });

  // 2. Send via Twilio REST API
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams();
  form.append("To", input.to);
  form.append("Body", input.body);
  if (messagingServiceSid) form.append("MessagingServiceSid", messagingServiceSid);
  else if (phone) form.append("From", phone);

  let twilioSid: string | undefined;
  let errorMessage: string | undefined;
  let errorCode: string | undefined;
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
      errorCode = json?.code != null ? String(json.code) : undefined;
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
  }

  if (!twilioSid) {
    if (logId) {
      await updateLog(admin, logId, {
        status: "failed",
        error: errorMessage ?? "Unknown Twilio error",
        error_code: errorCode ?? null,
      });
    }
    return { ok: false, status: "failed", error: errorMessage };
  }

  // 3. Atomic post-success credit deduction
  const { data: consumed, error: consumeErr } = await admin.rpc("consume_sms_credit", {
    _user_id: input.user_id,
    _event_id: input.event_id,
    _guest_id: input.guest_id,
    _twilio_sid: twilioSid,
  });
  if (consumeErr) console.error("[sms-service] consume_sms_credit failed", consumeErr);

  // 4. Transition queued -> sent (webhook will later move sent -> delivered/undelivered)
  if (logId) {
    await updateLog(admin, logId, {
      status: "sent",
      twilio_sid: twilioSid,
      error: consumed ? null : "credit_not_deducted",
    });
  }

  return { ok: true, status: "sent", twilio_sid: twilioSid };
}
