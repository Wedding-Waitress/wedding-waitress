import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioSid || !twilioToken || !twilioPhone) {
      return new Response(JSON.stringify({ error: 'SMS is not configured. Twilio credentials are missing.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { event_id, guest_ids } = await req.json();
    if (!event_id || !guest_ids?.length) {
      return new Response(JSON.stringify({ error: 'event_id and guest_ids required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user owns the event
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, name, date, venue, slug, partner1_name, partner2_name')
      .eq('id', event_id)
      .eq('user_id', userId)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found or unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: guests, error: guestsError } = await adminClient
      .from('guests')
      .select('id, first_name, last_name, mobile, rsvp_invite_status')
      .eq('event_id', event_id)
      .in('id', guest_ids);

    if (guestsError || !guests) {
      return new Response(JSON.stringify({ error: 'Failed to fetch guests' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const baseUrl = 'https://weddingwaitress.com.au';
    const rsvpLink = `${baseUrl}/s/${event.slug}`;
    const partnerNames = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');
    const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA';

    for (const guest of guests) {
      if (!guest.mobile || !guest.mobile.trim()) {
        skipped++;
        continue;
      }

      const smsBody = `Do not reply to this message. ${partnerNames || 'You are'} invite${partnerNames ? '' : 'd'} you to ${event.name} on ${eventDate}${event.venue ? ` at ${event.venue}` : ''}. RSVP here: ${rsvpLink}`;

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const authString = btoa(`${twilioSid}:${twilioToken}`);

        const formData = new URLSearchParams();
        formData.append('To', guest.mobile);
        formData.append('From', twilioPhone);
        formData.append('Body', smsBody);

        const smsRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const smsResult = await smsRes.json();

        if (smsRes.ok || smsResult.sid) {
          const newStatus = guest.rsvp_invite_status === 'email_sent' ? 'both_sent' : 'sms_sent';
          await adminClient.from('guests').update({
            rsvp_invite_status: newStatus,
            rsvp_invite_sent_at: new Date().toISOString(),
          }).eq('id', guest.id);

          await adminClient.from('rsvp_invite_logs').insert({
            event_id,
            guest_id: guest.id,
            user_id: userId,
            channel: 'sms',
            status: 'sent',
          });
          sent++;
        } else {
          await adminClient.from('rsvp_invite_logs').insert({
            event_id,
            guest_id: guest.id,
            user_id: userId,
            channel: 'sms',
            status: 'failed',
            error_message: JSON.stringify(smsResult),
          });
          failed++;
        }
      } catch (err) {
        await adminClient.from('rsvp_invite_logs').insert({
          event_id,
          guest_id: guest.id,
          user_id: userId,
          channel: 'sms',
          status: 'failed',
          error_message: String(err),
        });
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, failed, skipped }), {
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
