import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userRes.user.id;

    const body = await req.json();
    const eventId: string = body?.event_id;
    const venueEmail: string = (body?.venue_email ?? '').toString().trim();
    const venueContactName: string | null = body?.venue_contact_name ?? null;

    if (!eventId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(venueEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify ownership + master role
    const { data: event } = await admin
      .from('events')
      .select('id,name,venue,partner1_name,partner2_name,date,user_id')
      .eq('id', eventId)
      .maybeSingle();
    if (!event || event.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isMaster } = await admin.rpc('is_account_master', { _user_id: userId });
    if (!isMaster) {
      return new Response(JSON.stringify({ error: 'Only the account master can invite venues.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const couple = [event.partner1_name, event.partner2_name].filter(Boolean).join(' & ') || 'A couple';
    const greeting = venueContactName?.trim() ? `Hi ${venueContactName.trim()},` : 'Hello,';
    const venuePart = event.venue ? ` at ${event.venue}` : '';

    const html = `<!doctype html><html><body style="background:#ffffff;font-family:Inter,Arial,sans-serif;color:#3D2E1E;">
<div style="max-width:560px;margin:0 auto;padding:32px 28px;">
  <h1 style="font-size:22px;font-weight:600;color:#3D2E1E;margin:0 0 20px;">An invitation to explore Wedding Waitress</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${greeting}</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${escapeHtml(couple)} is currently using Wedding Waitress to plan their wedding${escapeHtml(venuePart)}, and thought your venue may also benefit from the platform.</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Wedding Waitress helps venues and couples coordinate seamlessly, with tools for:</p>
  <ul style="padding-left:20px;margin:0 0 20px;color:#3D2E1E;font-size:15px;line-height:1.8;">
    <li>Guest management</li>
    <li>RSVP coordination</li>
    <li>Planning workflows</li>
    <li>Seating management</li>
    <li>Operational efficiency</li>
  </ul>
  <p style="margin:24px 0;">
    <a href="https://weddingwaitress.com.au/?ref=venue-${event.id}" style="background:#967A59;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Explore Wedding Waitress</a>
  </p>
  <p style="font-size:13px;color:#6E6E73;margin:24px 0 0;font-style:italic;">Built for couples, planners, and venues coordinating events together.</p>
  <p style="font-size:13px;color:#6E6E73;margin:8px 0 0;">— The Wedding Waitress Team</p>
</div>
</body></html>`;

    const { error: invokeErr } = await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'venue-invitation-inline',
        recipientEmail: venueEmail,
        idempotencyKey: `venue-invite-${event.id}-${venueEmail.toLowerCase()}`,
        // Inline HTML fallback path — if template not registered, send-transactional-email
        // expects a registered template. We register one in the templates registry.
        templateData: {
          coupleNames: couple,
          venueName: event.venue ?? '',
          contactName: venueContactName ?? '',
          eventId: event.id,
        },
      },
    });

    if (invokeErr) {
      console.error('send-transactional-email error', invokeErr);
      return new Response(JSON.stringify({ error: 'Email send failed', detail: invokeErr.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
