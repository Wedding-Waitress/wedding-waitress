import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    console.log('Running auto-reminder scheduler...');

    // Find all events with auto_reminders_enabled
    const { data: automationSettings } = await supabase
      .from('event_rsvp_automation_settings')
      .select('*, events(*)')
      .eq('auto_reminders_enabled', true);

    if (!automationSettings || automationSettings.length === 0) {
      console.log('No events with auto reminders enabled');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processed = 0;

    for (const setting of automationSettings) {
      const event = setting.events;
      const eventDate = new Date(event.date);
      const reminderDate = new Date(eventDate);
      reminderDate.setDate(reminderDate.getDate() - setting.reminder_days_before);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      reminderDate.setHours(0, 0, 0, 0);

      // Check if today is the reminder day
      if (today.getTime() === reminderDate.getTime()) {
        console.log(`Processing reminder for event: ${event.name}`);

        // Get guests for this event
        let guestQuery = supabase
          .from('guests')
          .select('*')
          .eq('event_id', event.id);

        // If only_no_reply is true, filter for Pending RSVP
        if (setting.reminder_only_no_reply) {
          guestQuery = guestQuery.eq('rsvp', 'Pending');
        }

        const { data: guests } = await guestQuery;

        if (guests && guests.length > 0) {
          // Create a reminder campaign
          const { data: campaign } = await supabase
            .from('rsvp_reminder_campaigns')
            .insert({
              event_id: event.id,
              user_id: event.user_id,
              name: `Auto Reminder - ${setting.reminder_days_before} days before`,
              message_template: `Hi {firstName}, this is a friendly reminder about ${event.name} on ${new Date(event.date).toLocaleDateString()}. Please confirm your RSVP!`,
              delivery_method: 'email',
              target_status: setting.reminder_only_no_reply ? ['Pending'] : ['Pending', 'Attending', 'Not Attending'],
              status: 'scheduled',
              total_count: guests.length,
            })
            .select()
            .single();

          if (campaign) {
            // Call send-bulk-reminders function
            await supabase.functions.invoke('send-bulk-reminders', {
              body: { campaign_id: campaign.id }
            });

            // Update automation settings
            await supabase
              .from('event_rsvp_automation_settings')
              .update({
                last_reminder_sent_at: new Date().toISOString(),
                next_reminder_scheduled_at: null,
              })
              .eq('id', setting.id);

            processed++;
          }
        }
      } else if (reminderDate > today) {
        // Update next_reminder_scheduled_at
        await supabase
          .from('event_rsvp_automation_settings')
          .update({ next_reminder_scheduled_at: reminderDate.toISOString() })
          .eq('id', setting.id);
      }
    }

    console.log(`Processed ${processed} auto-reminders`);

    return new Response(
      JSON.stringify({ processed }),
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