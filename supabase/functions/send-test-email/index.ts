import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  template_html: string;
  template_name: string;
  recipient_email: string;
  event_id?: string;
  custom_subject?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { 
      template_html, 
      template_name, 
      recipient_email,
      event_id,
      custom_subject 
    }: TestEmailRequest = await req.json();

    // Validate required fields
    if (!template_html || !template_name || !recipient_email) {
      throw new Error('Missing required fields');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
      throw new Error('Invalid email format');
    }

    // Check rate limiting (10 test emails per hour per user)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('reminder_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('delivery_method', 'test_email')
      .gte('sent_at', oneHourAgo);

    if (countError) {
      console.error('Rate limit check error:', countError);
    } else if (count && count >= 10) {
      throw new Error('Rate limit exceeded. Maximum 10 test emails per hour.');
    }

    // Get user's notification settings for Resend API key
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('resend_api_key, from_email')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings?.resend_api_key) {
      throw new Error('Please configure your Resend API key in RSVP Notifications settings first');
    }

    // Fetch event data if provided
    let eventData: any = null;
    if (event_id) {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', event_id)
        .eq('user_id', user.id)
        .single();

      if (!eventError && event) {
        eventData = event;
      }
    }

    // Replace placeholders in template HTML
    let finalHtml = template_html;
    const replacements: Record<string, string> = {
      '{{GUEST_FIRST_NAME}}': 'Sample',
      '{{GUEST_NAME}}': 'Sample Guest',
      '{{FULL_NAME}}': 'Sample Guest',
      '{{EVENT_NAME}}': eventData?.name || 'Sample Wedding',
      '{{EVENT_DATE}}': eventData?.date ? new Date(eventData.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'June 15, 2024',
      '{{EVENT_VENUE}}': eventData?.venue || 'Beautiful Venue',
      '{{PARTNER1_NAME}}': eventData?.partner1_name || 'Partner One',
      '{{PARTNER2_NAME}}': eventData?.partner2_name || 'Partner Two',
      '{{EVENT_URL}}': eventData?.slug ? `https://weddingwaitress.com/s/${eventData.slug}` : 'https://example.com/rsvp',
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      finalHtml = finalHtml.replaceAll(placeholder, value);
    }

    // Generate subject line
    const subject = custom_subject || `[TEST] ${template_name}${eventData ? ` - ${eventData.name}` : ''}`;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.resend_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: settings.from_email || 'Wedding Waitress <onboarding@resend.dev>',
        to: [recipient_email],
        subject,
        html: finalHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const resendData = await resendResponse.json();

    // Log the test email (for analytics and rate limiting)
    await supabase
      .from('reminder_deliveries')
      .insert({
        campaign_id: null,
        user_id: user.id,
        guest_id: null,
        delivery_method: 'test_email',
        recipient: recipient_email,
        status: 'delivered',
        sent_at: new Date().toISOString(),
        metadata: {
          template_name,
          event_id,
          resend_id: resendData.id,
        },
      });

    console.log('Test email sent successfully:', {
      recipient: recipient_email,
      template: template_name,
      event_id,
      resend_id: resendData.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test email sent successfully',
        resend_id: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-test-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send test email' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
