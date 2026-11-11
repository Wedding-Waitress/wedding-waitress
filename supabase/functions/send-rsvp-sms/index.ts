import { requirePlanningEventOwner } from '../_shared/team-planning-access.ts';
import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { getAdminSupabase, getRemainingCredits, getSmsConfigurationError, sendSmsAndAccount } from "../_shared/sms-service.ts";
import { resolveRecipientInvitationUrl } from '../_shared/public-rsvp-link.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    let userId = claimsData.claims.sub as string;
    const { data: operational } = await supabase.rpc('is_account_operational', { p_user_id: userId });
    if (operational !== true) return new Response(JSON.stringify({ error: 'Account access is closed' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { event_id, guest_ids, request_id: suppliedRequestId, dry_run } = await req.json();
    const request_id = suppliedRequestId ?? crypto.randomUUID(); // Existing clients may omit this field.
    if (!event_id || !Array.isArray(guest_ids) || !guest_ids.length || guest_ids.some(id => typeof id !== 'string')) {
      return new Response(JSON.stringify({ error: 'event_id, guest_ids and request_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request_id)) {
      return new Response(JSON.stringify({ error: 'Invalid invitation request identifier.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = getAdminSupabase();
    userId = await requirePlanningEventOwner(admin, userId, event_id);

    const { data: event, error: eventError } = await admin
      .from('events')
      .select('id, name, date, venue, slug, partner1_name, partner2_name, user_id')
      .eq('id', event_id)
      .single();

    if (eventError || !event || event.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Event not found or unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const configurationError = getSmsConfigurationError();
    if (configurationError) {
      return new Response(JSON.stringify({ error: configurationError, code: 'SMS_NOT_CONFIGURED' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pre-flight credit check
    let initialRemaining: number;
    try {
      initialRemaining = await getRemainingCredits(admin, userId, event_id);
    } catch (creditError) {
      const reference = crypto.randomUUID();
      console.error('send-rsvp-sms credit preflight failed', { reference, creditError, userId, event_id });
      return new Response(JSON.stringify({
        error: `The shared invitation credit balance could not be verified. No message was sent and no credit was used. Reference: ${reference}`,
        code: 'CREDIT_LEDGER_UNAVAILABLE',
      }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (initialRemaining <= 0) {
      return new Response(JSON.stringify({
        error: 'No SMS credits remaining. Please purchase a top-up to continue sending.',
        code: 'NO_CREDITS',
        remaining: 0,
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: guests, error: guestsError } = await admin
      .from('guests')
      .select('id, first_name, last_name, mobile, rsvp_invite_status')
      .eq('event_id', event_id)
      .in('id', guest_ids);

    if (guestsError || !guests) {
      return new Response(JSON.stringify({ error: 'Failed to fetch guests' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (dry_run === true) return new Response(JSON.stringify({ dry_run: true, configuration_present: true, recipients: guests.filter(g => g.mobile?.trim()).length, remaining: initialRemaining, sent: 0, credits_used: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const partnerNames = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');
    const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA';

    let trackingPending = 0;
    let sent = 0, failed = 0, skipped = 0, blocked = 0;
    const failures: string[] = [];
    let remaining = initialRemaining;

    for (const guest of guests) {
      if (!guest.mobile || !guest.mobile.trim()) { skipped++; continue; }

      if (remaining <= 0) {
        blocked++;
        continue;
      }

      const rsvpLink = await resolveRecipientInvitationUrl(admin, event_id, event.slug, guest.id);

      const smsBody = `Do not reply to this message. ${partnerNames || 'You are'} invite${partnerNames ? '' : 'd'} you to ${event.name} on ${eventDate}${event.venue ? ` at ${event.venue}` : ''}. RSVP here: ${rsvpLink}`;

      const compact = guest.mobile.replace(/[\s().-]/g, '');
      const e164 = /^04\d{8}$/.test(compact) ? `+61${compact.slice(1)}`
        : /^614\d{8}$/.test(compact) ? `+${compact}` : compact;
      if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
        failed++;
        failures.push(`${guest.first_name}: invalid mobile number; save it with an international country code.`);
        continue;
      }

      const result = await sendSmsAndAccount(admin, {
        user_id: userId,
        event_id,
        guest_id: guest.id,
        to: e164,
        body: smsBody,
        delivery_id: `${request_id}:${guest.id}:sms`,
      });

      if (result.status === 'sent') {
          const { error: trackingError } = await admin.rpc('record_rsvp_acceptance', {
            _event_id: event_id, _guest_id: guest.id, _user_id: userId, _channel: 'sms',
          });
          if (trackingError) {
            trackingPending++;
            console.error('RSVP sms acceptance tracking pending', { request_id, code: trackingError.code });
          }
        sent++;
        remaining = Math.max(0, remaining - 1);
      } else if (result.status === 'blocked') {
        blocked++;
        if (result.error) failures.push(result.error);
      } else {
        await admin.from('rsvp_invite_logs').insert({
          event_id,
          guest_id: guest.id,
          user_id: userId,
          channel: 'sms',
          status: 'failed',
          error_message: result.error ?? 'unknown',
        });
        failed++;
        if (result.error) failures.push(result.error);
      }
    }

    if (sent === 0 && (failed > 0 || blocked > 0)) {
      const noCredits = failures.some(message => /credits/i.test(message));
      return new Response(JSON.stringify({
        error: noCredits
          ? 'No shared Email & SMS credits remain for this event.'
          : (failures[0] || 'The SMS provider did not accept the invitation. No credit was used and the invitation status was not changed.'),
        code: noCredits ? 'NO_CREDITS' : 'SMS_SEND_FAILED', sent, failed, skipped, blocked, remaining,
      }), { status: noCredits ? 402 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ sent, failed, skipped, blocked, remaining, tracking_pending: trackingPending, acceptance: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error('send-rsvp-sms error', { reference, error });
    return new Response(JSON.stringify({ error: `The SMS invitation service could not complete the request. Check the delivery log before retrying. Reference: ${reference}`, code: 'SMS_SERVICE_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
