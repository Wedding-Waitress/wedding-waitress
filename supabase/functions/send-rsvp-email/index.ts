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
    const userId = claimsData.claims.sub;

    const { event_id, guest_ids } = await req.json();
    if (!event_id || !guest_ids?.length) {
      return new Response(JSON.stringify({ error: 'event_id and guest_ids required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role client for data operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

    // Fetch guests
    const { data: guests, error: guestsError } = await adminClient
      .from('guests')
      .select('id, first_name, last_name, email, rsvp_invite_status')
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

    const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA';
    const partnerNames = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ');
    const deadlineText = event.rsvp_deadline
      ? `Please RSVP by ${new Date(event.rsvp_deadline).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}.`
      : '';

    for (const guest of guests) {
      if (!guest.email || !guest.email.trim()) {
        skipped++;
        continue;
      }

      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;">You're Invited!</h1>
  </div>
  <div style="padding:30px;">
    <p style="color:#999;font-size:12px;text-align:center;margin-bottom:20px;">Please do not reply to this email. Use the link below to respond.</p>
    <p style="font-size:16px;color:#333;">Dear ${guest.first_name},</p>
    <p style="font-size:16px;color:#333;line-height:1.6;">
      ${partnerNames ? `<strong>${partnerNames}</strong> warmly invite you` : 'You are warmly invited'} to celebrate at 
      <strong>${event.name}</strong> on <strong>${eventDate}</strong>${event.venue ? ` at <strong>${event.venue}</strong>` : ''}.
    </p>
    ${deadlineText ? `<p style="font-size:14px;color:#666;margin-top:16px;">${deadlineText}</p>` : ''}
    <div style="text-align:center;margin:30px 0;">
      <a href="${rsvpLink}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:50px;font-size:18px;font-weight:bold;">RSVP Now</a>
    </div>
    <p style="font-size:13px;color:#999;text-align:center;">Click the button above to view your details and respond.</p>
  </div>
  <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;font-size:12px;color:#999;">Powered by <strong>Wedding Waitress</strong></p>
    <p style="margin:4px 0 0;font-size:11px;color:#bbb;">weddingwaitress.com.au</p>
  </div>
</div>
</body>
</html>`;

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Wedding Waitress <noreply@weddingwaitress.com>',
            to: [guest.email],
            subject: `You're Invited — ${event.name}`,
            html: htmlBody,
          }),
        });

        const emailResult = await emailRes.json();

        if (emailRes.ok) {
          // Update guest invite status
          const newStatus = guest.rsvp_invite_status === 'sms_sent' ? 'both_sent' : 'email_sent';
          await adminClient.from('guests').update({
            rsvp_invite_status: newStatus,
            rsvp_invite_sent_at: new Date().toISOString(),
          }).eq('id', guest.id);

          // Log the send
          await adminClient.from('rsvp_invite_logs').insert({
            event_id,
            guest_id: guest.id,
            user_id: userId,
            channel: 'email',
            status: 'sent',
          });

          sent++;
        } else {
          await adminClient.from('rsvp_invite_logs').insert({
            event_id,
            guest_id: guest.id,
            user_id: userId,
            channel: 'email',
            status: 'failed',
            error_message: JSON.stringify(emailResult),
          });
          failed++;
        }
      } catch (err) {
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

    return new Response(JSON.stringify({ sent, failed, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-rsvp-email error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
