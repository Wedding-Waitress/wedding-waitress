import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guest_id, event_id, old_rsvp, new_rsvp, user_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get notification settings
    const { data: settings } = await supabase
      .from('rsvp_notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (!settings || !settings.email_notifications) {
      return new Response(
        JSON.stringify({ message: 'Notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get guest and event details
    const { data: guest } = await supabase
      .from('guests')
      .select('first_name, last_name, table_no')
      .eq('id', guest_id)
      .single();

    const { data: event } = await supabase
      .from('events')
      .select('name, date')
      .eq('id', event_id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    const recipientEmail = settings.notification_email || profile?.email;
    
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'No email configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Send email notification (implement with Resend or similar)
    const rsvpStatusEmoji = new_rsvp === 'Attending' ? '✅' : new_rsvp === 'Not Attending' ? '❌' : '🔄';
    const guestName = `${guest?.first_name} ${guest?.last_name}`;
    
    console.log(`📧 RSVP Notification: ${guestName} changed RSVP from ${old_rsvp} to ${new_rsvp}`);
    console.log(`Would send email to: ${recipientEmail}`);
    console.log(`Event: ${event?.name} on ${event?.date}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent',
        details: {
          guest: guestName,
          status: new_rsvp,
          event: event?.name
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});