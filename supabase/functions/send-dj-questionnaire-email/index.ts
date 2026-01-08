import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  questionnaireId: string;
  recipientEmails: string[];
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
          error: 'Email not configured',
          message: 'Please configure email settings in Settings → Notifications'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email is enabled and has required credentials
    if (!settings.email_enabled || !settings.resend_api_key || !settings.from_email) {
      return new Response(
        JSON.stringify({ 
          error: 'Email not configured',
          message: 'Please enable email and configure Resend API key in Settings'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { questionnaireId, recipientEmails, shareLink }: EmailRequest = await req.json();

    // Dynamically import Resend (only loaded if we get here)
    const { Resend } = await import('npm:resend@2.0.0');
    const resend = new Resend(settings.resend_api_key);

    // Send emails
    const emailPromises = recipientEmails.map(email =>
      resend.emails.send({
        from: settings.from_email,
        to: [email],
        subject: 'DJ Questionnaire - Please Complete',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6D28D9;">DJ Questionnaire</h1>
            <p>You've received a DJ questionnaire to complete.</p>
            <p>Please click the link below to access and complete the questionnaire:</p>
            <a href="${shareLink}" 
               style="display: inline-block; padding: 12px 24px; background-color: #6D28D9; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Complete Questionnaire
            </a>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link:<br>
              ${shareLink}
            </p>
          </div>
        `,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Update questionnaire sent_at timestamp
    await supabaseClient
      .from('dj_questionnaires')
      .update({ 
        sent_at: new Date().toISOString(),
        recipient_emails: recipientEmails 
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
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
