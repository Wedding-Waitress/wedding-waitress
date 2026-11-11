import { requirePlanningEventOwner } from '../_shared/team-planning-access.ts';
import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { beginOperationalEmail, acceptOperationalEmail, failOperationalEmail, stableEmailMessageId } from '../_shared/customer-email-data.ts';
import { resolveRecipientInvitationUrl } from '../_shared/public-rsvp-link.ts';
import { loadInvitationHero, renderInvitationEmail } from '../_shared/invitation-email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Manual JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
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

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email sending is not configured. Add RESEND_API_KEY to the Edge Function secrets.', code: 'EMAIL_NOT_CONFIGURED' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role client for data operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    userId = await requirePlanningEventOwner(adminClient, userId, event_id);

    // Verify user owns the event
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, name, date, venue, slug, partner1_name, partner2_name, rsvp_deadline')
      .eq('id', event_id)
      .eq('user_id', userId)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found or unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: balanceRows, error: balanceError } = await adminClient.rpc('get_sms_credits', {
      _user_id: userId, _event_id: event_id,
    });
    if (balanceError) {
      const reference = crypto.randomUUID();
      console.error('send-rsvp-email credit preflight failed', { reference, balanceError, userId, event_id });
      return new Response(JSON.stringify({
        error: `The shared invitation credit balance could not be verified. No message was sent and no credit was used. Reference: ${reference}`,
        code: 'CREDIT_LEDGER_UNAVAILABLE',
      }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const balance = Array.isArray(balanceRows) ? balanceRows[0] : balanceRows;
    if (Number(balance?.remaining || 0) <= 0) {
      return new Response(JSON.stringify({ error: 'No Email & SMS credits remaining. Please purchase a top-up to continue.', code: 'NO_CREDITS', remaining: 0 }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch guests
    const { data: guests, error: guestsError } = await adminClient
      .from('guests')
      .select('id, first_name, last_name, email, rsvp_invite_status')
      .eq('event_id', event_id)
      .in('id', guest_ids);

    if (guestsError || !guests) {
      return new Response(JSON.stringify({ error: 'Failed to fetch guests' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let trackingPending = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    if (dry_run === true) return new Response(JSON.stringify({ dry_run: true, configuration_present: true, recipients: guests.filter(g => g.email?.trim()).length, remaining: Number(balance.remaining), sent: 0, credits_used: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Read the current published Live View artwork for this send, never a client snapshot.
    const heroUrl = await loadInvitationHero(adminClient, event_id);

    for (const guest of guests) {
      if (!guest.email || !guest.email.trim()) {
        skipped++;
        continue;
      }

      const rsvpLink = await resolveRecipientInvitationUrl(adminClient, event_id, event.slug, guest.id);

      const { html: htmlBody, text: textBody } = renderInvitationEmail({
        eventName: event.name, invitationUrl: rsvpLink, heroUrl,
      });

      let creditReserved = false;
      let providerAccepted = false;
      const deliveryId = await stableEmailMessageId(`${request_id}:${guest.id}:email`);
      try {
        const claimed = await beginOperationalEmail(adminClient, deliveryId, 'rsvp-invite', guest.email, userId, event_id);
        if (!claimed) { skipped++; continue; }
        const { data: reserved, error: reserveError } = await adminClient.rpc('consume_communication_credit', {
          _user_id: userId, _event_id: event_id, _guest_id: guest.id, _channel: 'email', _delivery_id: deliveryId,
        });
        if (reserveError) throw reserveError;
        if (reserved !== true) { await failOperationalEmail(adminClient, deliveryId); skipped++; continue; }
        creditReserved = true;
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': deliveryId,
          },
          body: JSON.stringify({
            from: "Wedding Waitress <support@weddingwaitress.com.au>",
            reply_to: 'support@weddingwaitress.com.au',
            to: [guest.email],
            subject: `You're Invited — ${event.name}`,
            html: htmlBody,
            text: textBody,
          }),
        });

        const emailResult = await emailRes.json();

        if (emailRes.ok && typeof emailResult?.id === 'string') {
          providerAccepted = true;
          creditReserved = false;
          await acceptOperationalEmail(adminClient, deliveryId, emailResult?.id);
          const { error: trackingError } = await adminClient.rpc('record_rsvp_acceptance', {
            _event_id: event_id, _guest_id: guest.id, _user_id: userId, _channel: 'email',
          });
          if (trackingError) {
            trackingPending++;
            console.error('RSVP email acceptance tracking pending', { request_id, code: trackingError.code });
          }
          sent++;
        } else {
          await failOperationalEmail(adminClient, deliveryId);
          await adminClient.rpc('restore_communication_credit', { _user_id: userId, _event_id: event_id });
          creditReserved = false;
          await adminClient.from('rsvp_invite_logs').insert({
            event_id,
            guest_id: guest.id,
            user_id: userId,
            channel: 'email',
            status: 'failed',
            error_message: `Email provider rejected request (${emailRes.status})`,
          });
          failed++;
        }
      } catch (err) {
        if (providerAccepted) {
          sent++; trackingPending++;
          console.error('RSVP email accepted; audit pending', { deliveryId });
          continue;
        }
        await failOperationalEmail(adminClient, deliveryId);
        if (creditReserved) await adminClient.rpc('restore_communication_credit', { _user_id: userId, _event_id: event_id });
        await adminClient.from('rsvp_invite_logs').insert({
          event_id,
          guest_id: guest.id,
          user_id: userId,
          channel: 'email',
          status: 'failed',
          error_message: String(err),
        });
        failed++;
      }
    }

    if (sent === 0 && failed > 0) {
      return new Response(JSON.stringify({ error: 'The email provider did not accept the invitation. No credit was used and the invitation status was not changed.', code: 'EMAIL_SEND_FAILED', sent, failed, skipped }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sent, failed, skipped, tracking_pending: trackingPending, acceptance: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error('send-rsvp-email error', { reference, error });
    return new Response(JSON.stringify({ error: `The email invitation service could not complete the request. Check the delivery log before retrying. Reference: ${reference}`, code: 'EMAIL_SERVICE_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
