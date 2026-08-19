import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminSupabase, getRemainingCredits, sendSmsAndAccount } from "../_shared/sms-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
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
    const userId = claimsData.claims.sub as string;
    const { data: operational } = await supabase.rpc('is_account_operational', { p_user_id: userId });
    if (operational !== true) return new Response(JSON.stringify({ error: 'Account access is closed' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { event_id, guest_ids } = await req.json();
    if (!event_id || !guest_ids?.length) {
      return new Response(JSON.stringify({ error: 'event_id and guest_ids required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = getAdminSupabase();

    const { data: event, error: eventError } = await admin
      .from('events')
      .select('id, name, date, venue, slug, partner1_name, partner2_name, user_id')
      .eq('id', event_id)
      .single();

    if (eventError || !event || event.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Event not found or unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pre-flight credit check
    const initialRemaining = await getRemainingCredits(admin, userId, event_id);
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

    const baseUrl = 'https://weddingwaitress.com.au';
    const rsvpLink = `${baseUrl}/s/${event.slug}`;
    const partnerNames = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');
    const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA';

    let sent = 0, failed = 0, skipped = 0, blocked = 0;
    let remaining = initialRemaining;

    for (const guest of guests) {
      if (!guest.mobile || !guest.mobile.trim()) { skipped++; continue; }

      if (remaining <= 0) {
        blocked++;
        continue;
      }

      const smsBody = `Do not reply to this message. ${partnerNames || 'You are'} invite${partnerNames ? '' : 'd'} you to ${event.name} on ${eventDate}${event.venue ? ` at ${event.venue}` : ''}. RSVP here: ${rsvpLink}`;

      const result = await sendSmsAndAccount(admin, {
        user_id: userId,
        event_id,
        guest_id: guest.id,
        to: guest.mobile,
        body: smsBody,
      });

      if (result.status === 'sent') {
        const newStatus = guest.rsvp_invite_status === 'email_sent' ? 'both_sent' : 'sms_sent';
        await admin.from('guests').update({
          rsvp_invite_status: newStatus,
          rsvp_invite_sent_at: new Date().toISOString(),
        }).eq('id', guest.id);

        await admin.from('rsvp_invite_logs').insert({
          event_id,
          guest_id: guest.id,
          user_id: userId,
          channel: 'sms',
          status: 'sent',
        });
        sent++;
        remaining = Math.max(0, remaining - 1);
      } else if (result.status === 'blocked') {
        blocked++;
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
      }
    }

    return new Response(JSON.stringify({ sent, failed, skipped, blocked, remaining }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-rsvp-sms error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
