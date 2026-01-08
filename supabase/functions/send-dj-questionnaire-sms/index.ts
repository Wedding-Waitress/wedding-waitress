import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  questionnaireId: string;
  recipientPhones: string[];
  shareLink: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's notification settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      console.log('No notification settings found');
      return new Response(
        JSON.stringify({ 
          error: 'SMS not configured',
          message: 'Please configure SMS settings in Settings → Notifications'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate SMS is enabled and has required credentials
    if (!settings.sms_enabled || settings.sms_provider !== 'twilio') {
      return new Response(
        JSON.stringify({ 
          error: 'SMS not configured',
          message: 'Please enable SMS and configure Twilio credentials in Settings'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.twilio_account_sid || !settings.twilio_auth_token || !settings.twilio_messaging_service_sid) {
      return new Response(
        JSON.stringify({ 
          error: 'SMS credentials incomplete',
          message: 'Please configure all Twilio credentials in Settings'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { questionnaireId, recipientPhones, shareLink }: SMSRequest = await req.json();

    // Dynamically import Twilio (only loaded if we get here)
    const twilio = await import('npm:twilio@4.19.0');
    const twilioClient = twilio.default(
      settings.twilio_account_sid,
      settings.twilio_auth_token
    );

    // Send SMS messages
    const smsPromises = recipientPhones.map(phone =>
      twilioClient.messages.create({
        messagingServiceSid: settings.twilio_messaging_service_sid,
        to: phone,
        body: `You have a DJ questionnaire to complete. Click here: ${shareLink}`
      })
    );

    const results = await Promise.allSettled(smsPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Update questionnaire sms_sent_at timestamp
    await supabaseClient
      .from('dj_questionnaires')
      .update({ 
        sms_sent_at: new Date().toISOString(),
        recipient_phones: recipientPhones 
      })
      .eq('id', questionnaireId);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: successful,
        failed: failed,
        message: `Sent to ${successful} recipient${successful !== 1 ? 's' : ''}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('SMS sending error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
