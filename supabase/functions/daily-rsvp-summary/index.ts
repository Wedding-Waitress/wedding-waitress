import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running daily RSVP summary...');

    // Find all events with daily_summary_enabled
    const { data: automationSettings } = await supabase
      .from('event_rsvp_automation_settings')
      .select('*, events(*)')
      .eq('daily_summary_enabled', true);

    if (!automationSettings || automationSettings.length === 0) {
      console.log('No events with daily summary enabled');
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let sent = 0;

    for (const setting of automationSettings) {
      const event = setting.events;
      const lastSummary = setting.last_daily_summary_sent_at 
        ? new Date(setting.last_daily_summary_sent_at)
        : new Date(0);

      // Get RSVP changes since last summary
      const { data: guests } = await supabase
        .from('guests')
        .select('rsvp')
        .eq('event_id', event.id);

      if (!guests) continue;

      const accepted = guests.filter(g => g.rsvp === 'Attending').length;
      const declined = guests.filter(g => g.rsvp === 'Not Attending').length;
      const pending = guests.filter(g => g.rsvp === 'Pending').length;

      // Get notification settings
      const { data: apiSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', event.user_id)
        .single();

      if (!apiSettings?.resend_api_key || !apiSettings?.from_email) {
        console.log(`Skipping event ${event.name} - no email config`);
        continue;
      }

      // Build email content
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; }
    .stat { display: inline-block; margin: 10px 20px; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 14px; color: #6b7280; }
    .accepted { color: #10b981; }
    .declined { color: #ef4444; }
    .pending { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily RSVP Summary</h1>
      <p>${event.name}</p>
    </div>
    <div class="content">
      <h2>Current RSVP Status</h2>
      <div style="text-align: center; margin: 30px 0;">
        <div class="stat">
          <div class="stat-value accepted">✅ ${accepted}</div>
          <div class="stat-label">Accepted</div>
        </div>
        <div class="stat">
          <div class="stat-value declined">❌ ${declined}</div>
          <div class="stat-label">Declined</div>
        </div>
        <div class="stat">
          <div class="stat-value pending">⏳ ${pending}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Total Guests: ${guests.length}
      </p>
      ${setting.next_reminder_scheduled_at ? `
        <p style="margin-top: 30px; padding: 15px; background: #faf5ff; border-left: 4px solid #8b5cf6; border-radius: 4px;">
          <strong>📅 Next Auto Reminder:</strong><br>
          ${new Date(setting.next_reminder_scheduled_at).toLocaleString()}
        </p>
      ` : ''}
    </div>
  </div>
</body>
</html>
      `;

      // Send email
      const resend = new Resend(apiSettings.resend_api_key);
      
      // Determine recipients based on host alerts settings
      const recipients: string[] = [];
      if (setting.notify_partner1 && event.partner1_name) {
        // Would need partner1_email field - for now use event owner's email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', event.user_id)
          .single();
        if (profile?.email) recipients.push(profile.email);
      }

      if (recipients.length > 0) {
        await resend.emails.send({
          from: apiSettings.from_email,
          to: recipients,
          subject: `📊 Daily RSVP Summary: ${event.name}`,
          html,
        });

        // Update last_daily_summary_sent_at
        await supabase
          .from('event_rsvp_automation_settings')
          .update({ last_daily_summary_sent_at: new Date().toISOString() })
          .eq('id', setting.id);

        sent++;
        console.log(`Sent daily summary for event: ${event.name}`);
      }
    }

    return new Response(
      JSON.stringify({ sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});