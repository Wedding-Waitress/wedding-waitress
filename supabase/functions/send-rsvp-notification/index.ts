import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildRSVPNotificationEmail } from './email-template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guest_id, event_id, old_rsvp, new_rsvp, user_id, is_test } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📧 Processing RSVP notification:', { guest_id, event_id, old_rsvp, new_rsvp, user_id, is_test });

    // 1. Check RSVP notification preferences
    const { data: rsvpSettings, error: rsvpError } = await supabase
      .from('rsvp_notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (rsvpError || !rsvpSettings || !rsvpSettings.email_notifications) {
      console.log('RSVP notifications disabled by user');
      return new Response(
        JSON.stringify({ message: 'RSVP notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check specific notification preferences
    const shouldNotify = 
      (new_rsvp === 'Attending' && rsvpSettings.notify_on_accept) ||
      (new_rsvp === 'Not Attending' && rsvpSettings.notify_on_decline) ||
      (new_rsvp !== 'Pending' && old_rsvp !== 'Pending' && rsvpSettings.notify_on_update);

    if (!shouldNotify && !is_test) {
      console.log('Notification filtered by user preferences');
      return new Response(
        JSON.stringify({ message: 'Notification filtered by preferences' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Get email provider credentials
    const { data: notifSettings, error: notifError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (notifError || !notifSettings?.email_enabled || !notifSettings?.resend_api_key || !notifSettings?.from_email) {
      console.error('Email not configured:', notifError);
      return new Response(
        JSON.stringify({ 
          error: 'Email not configured',
          message: 'Please configure Resend API key and from email in Settings → Notifications' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 412 }
      );
    }

    // 3. Get guest and event details (or use test data)
    let guestName = '';
    let eventName = '';
    let eventDate = '';
    let tableNo: number | undefined;

    if (is_test) {
      guestName = 'John Smith';
      eventName = 'Sample Wedding';
      eventDate = '2025-06-15';
      tableNo = 5;
    } else {
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

      if (!guest || !event) {
        throw new Error('Guest or event not found');
      }

      guestName = `${guest.first_name} ${guest.last_name}`;
      eventName = event.name;
      eventDate = event.date;
      tableNo = guest.table_no || undefined;
    }

    // 4. Determine recipient email
    const recipientEmail = rsvpSettings.notification_email || notifSettings.from_email;
    
    if (!recipientEmail) {
      console.error('No recipient email found');
      return new Response(
        JSON.stringify({ error: 'No email configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 5. Build email template
    const { subject, html } = buildRSVPNotificationEmail({
      guestName,
      oldRsvp: old_rsvp || 'Pending',
      newRsvp: new_rsvp,
      eventName,
      eventDate,
      tableNo,
      isTest: is_test,
    });

    // 6. Send email via Resend
    console.log('Sending email via Resend to:', recipientEmail);
    
    const { Resend } = await import('npm:resend@2.0.0');
    const resend = new Resend(notifSettings.resend_api_key);

    const emailResult = await resend.emails.send({
      from: notifSettings.from_email,
      to: [recipientEmail],
      subject,
      html,
    });

    if (emailResult.error) {
      console.error('Resend API error:', emailResult.error);
      throw new Error(`Resend error: ${emailResult.error.message}`);
    }

    console.log('✅ Email sent successfully:', emailResult.data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent',
        details: {
          guest: guestName,
          status: new_rsvp,
          event: eventName,
          email_id: emailResult.data?.id,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error sending RSVP notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
