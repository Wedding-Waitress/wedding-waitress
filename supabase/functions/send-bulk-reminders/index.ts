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
    const { campaign_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get campaign details
    const { data: campaign } = await supabase
      .from('rsvp_reminder_campaigns')
      .select('*, event:events(*)')
      .eq('id', campaign_id)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get target guests
    const { data: guests } = await supabase
      .from('guests')
      .select('*, communication_preferences:guest_communication_preferences(*)')
      .eq('event_id', campaign.event_id)
      .in('rsvp', campaign.target_status);

    if (!guests || guests.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No guests to send reminders to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get notification settings
    const { data: notifSettings } = await supabase
      .from('rsvp_notification_settings')
      .select('*')
      .eq('user_id', campaign.user_id)
      .single();

    const { data: apiSettings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', campaign.user_id)
      .single();

    // Update campaign status
    await supabase
      .from('rsvp_reminder_campaigns')
      .update({ status: 'sending', total_count: guests.length })
      .eq('id', campaign_id);

    let sentCount = 0;

    // Send reminders to each guest
    for (const guest of guests) {
      let deliveryStatus = 'failed';
      let errorMessage = null;

      try {
        // Replace template variables
        const message = campaign.message_template
          .replace(/{guest_name}/g, `${guest.first_name} ${guest.last_name}`)
          .replace(/{event_name}/g, campaign.event.name)
          .replace(/{rsvp_deadline}/g, campaign.event.rsvp_deadline || 'soon')
          .replace(/{qr_link}/g, `https://xytxkidpourwdbzzwcdp.supabase.co/s/${campaign.event.slug}`);

        // Send based on delivery method
        if (campaign.delivery_method === 'email' && guest.email) {
          const { Resend } = await import('npm:resend@2.0.0');
          const resend = new Resend(apiSettings.resend_api_key);
          
          await resend.emails.send({
            from: apiSettings.from_email,
            to: guest.email,
            subject: `RSVP Reminder: ${campaign.event.name}`,
            html: `<p>${message}</p>`,
          });
          deliveryStatus = 'sent';
          sentCount++;
        } else if ((campaign.delivery_method === 'sms' || campaign.delivery_method === 'whatsapp') && guest.mobile) {
          const twilioModule = await import('npm:twilio@4.0.0');
          const twilio = twilioModule.default(
            apiSettings.twilio_account_sid,
            apiSettings.twilio_auth_token
          );

          const fromNumber = campaign.delivery_method === 'whatsapp' 
            ? `whatsapp:${notifSettings.twilio_sender_id}`
            : notifSettings.twilio_sender_id;
          
          const toNumber = campaign.delivery_method === 'whatsapp'
            ? `whatsapp:${guest.mobile}`
            : guest.mobile;

          await twilio.messages.create({
            from: fromNumber,
            to: toNumber,
            body: message,
          });
          deliveryStatus = 'sent';
          sentCount++;
        } else {
          errorMessage = 'No contact method available';
        }

        console.log(`✅ Sent ${campaign.delivery_method} to ${guest.first_name} ${guest.last_name}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${guest.id}:`, error);
        errorMessage = error.message;
      }

      // Log delivery
      await supabase.from('reminder_deliveries').insert({
        campaign_id,
        guest_id: guest.id,
        delivery_method: campaign.delivery_method,
        status: deliveryStatus,
        error_message: errorMessage,
        sent_at: deliveryStatus === 'sent' ? new Date().toISOString() : null,
        reminder_type: 'bulk',
      });
    }

    // Update campaign
    await supabase
      .from('rsvp_reminder_campaigns')
      .update({ 
        status: 'completed', 
        sent_count: sentCount 
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: sentCount,
        total_count: guests.length 
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