// Centralized SMS sending service for Wedding Waitress.
// - Uses TWILIO_MESSAGING_SERVICE_SID primary; falls back to TWILIO_PHONE_NUMBER.
// - Atomic credit check + consume via SECURITY DEFINER RPCs.
// - Writes audit log to sms_send_logs with delivery-status-ready transitions:
//     queued -> sent | failed | blocked
//   Future Twilio status-callback webhook will then update sent -> delivered | undelivered.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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
  delivery_id: string;
}

export interface SmsSendResult {
  ok: boolean;
  status: "sent" | "failed" | "blocked";
  twilio_sid?: string;
  error?: string;
  code?: string;
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

export function getSmsConfigurationError(): string | null {
  if (!Deno.env.get("TWILIO_ACCOUNT_SID") || !Deno.env.get("TWILIO_AUTH_TOKEN")) {
    return 'SMS sending is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to the Edge Function secrets.';
  }
  if (!Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") && !Deno.env.get("TWILIO_PHONE_NUMBER")) {
    return 'SMS sending is not configured. Add TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER to the Edge Function secrets.';
  }
  return null;
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
    delivery_id: string;
  }
): Promise<{ id: string | null; duplicate: boolean }> {
  const { data, error } = await admin.from("sms_send_logs").insert({
    user_id: args.user_id, event_id: args.event_id, guest_id: args.guest_id,
    to_masked: args.to_masked, twilio_sid: args.twilio_sid, status: args.status,
    error_message: args.error ?? null, delivery_method: args.delivery_method ?? 'sms',
    delivery_id: args.delivery_id,
  }).select('id').maybeSingle();
  if (error?.code === '23505') return { id: null, duplicate: true };
  if (error) {
    console.error("[sms-service] log_sms_send failed", error);
    throw new Error('SMS audit is unavailable before sending');
  }
  return { id: data?.id ?? null, duplicate: false };
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

  const configurationError = getSmsConfigurationError();
  if (configurationError) {
    await insertLog(admin, {
      user_id: input.user_id,
      event_id: input.event_id,
      guest_id: input.guest_id,
      to_masked: masked,
      twilio_sid: null,
      status: "failed",
      error: configurationError,
      delivery_method: dm,
      delivery_id: input.delivery_id,
    });
    return { ok: false, status: "failed", error: configurationError, code: 'SMS_NOT_CONFIGURED' };
  }

  // Pre-check: credit must be available. A credit is reserved atomically before
  // provider delivery and restored whenever Twilio does not accept the message.
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
      delivery_id: input.delivery_id,
    });
    return { ok: false, status: "blocked", error: "No SMS credits remaining" };
  }

  // 1. Insert queued log row first so Twilio webhook callbacks can match by SID later.
  const claim = await insertLog(admin, {
    user_id: input.user_id,
    event_id: input.event_id,
    guest_id: input.guest_id,
    to_masked: masked,
    twilio_sid: null,
    status: "queued",
    delivery_method: dm,
    delivery_id: input.delivery_id,
  });
  if (claim.duplicate) return { ok: false, status: 'blocked', error: 'This invitation send was already submitted.', code: 'DUPLICATE_SEND' };
  const logId = claim.id;

  // Reserve one shared credit before contacting Twilio so concurrent requests
  // cannot overspend. The reservation is always restored unless Twilio accepts.
  const { data: reserved, error: reserveError } = await admin.rpc("consume_communication_credit", {
    _user_id: input.user_id, _event_id: input.event_id, _guest_id: input.guest_id,
    _channel: 'sms', _delivery_id: input.delivery_id,
  });
  if (reserveError) throw reserveError;
  if (reserved !== true) {
    if (logId) await updateLog(admin, logId, { status: 'blocked', error: 'No shared invitation credits remaining' });
    return { ok: false, status: 'blocked', error: 'No shared invitation credits remaining', code: 'NO_CREDITS' };
  }

  // 2. Send via Twilio REST API
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams();
  form.append("To", input.to);
  form.append("Body", input.body);
  if (messagingServiceSid) form.append("MessagingServiceSid", messagingServiceSid);
  else if (phone) form.append("From", phone);

  // Attach Twilio status callback so delivered/failed/blocked transitions
  // flow into sms_send_logs via the twilio-delivery-webhook edge function.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (supabaseUrl) {
    form.append("StatusCallback", `${supabaseUrl}/functions/v1/twilio-delivery-webhook`);
  }

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
    await admin.rpc('restore_communication_credit', { _user_id: input.user_id, _event_id: input.event_id });
    if (logId) {
      await updateLog(admin, logId, {
        status: "failed",
        error: errorMessage ?? "Unknown Twilio error",
        error_code: errorCode ?? null,
      });
    }
    return { ok: false, status: "failed", error: errorMessage };
  }

  // Twilio accepted the message, so retain the reserved credit and transition
  // queued -> sent. The webhook later moves sent -> delivered/undelivered.
  if (logId) {
    await updateLog(admin, logId, {
      status: "sent",
      twilio_sid: twilioSid,
      error: null,
    });
  }

  return { ok: true, status: "sent", twilio_sid: twilioSid };
}
