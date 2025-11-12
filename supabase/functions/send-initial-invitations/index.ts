import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "npm:resend@2.0.0";
import QRCode from "npm:qrcode@1.5.3";
import { 
  generateElegantTemplate, 
  generateModernTemplate, 
  generateRusticTemplate,
  type TemplateData,
  type TemplateType
} from "./_templates/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  campaign_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { campaign_id }: RequestBody = await req.json();
    console.log("Processing initial invitation campaign:", campaign_id);

    // Fetch campaign details with event data
    const { data: campaign, error: campaignError } = await supabase
      .from("rsvp_reminder_campaigns")
      .select(`
        *,
        events (
          id,
          name,
          date,
          venue,
          slug,
          partner1_name,
          partner2_name
        )
      `)
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    const event = campaign.events as any;
    const baseUrl = "https://wedding-waitress.lovable.app";
    const eventUrl = `${baseUrl}/s/${event.slug}`;

    // Fetch guests based on campaign target status
    let query = supabase
      .from("guests")
      .select("id, first_name, last_name, email")
      .eq("event_id", event.id)
      .not("email", "is", null)
      .neq("email", "");

    if (campaign.target_status && campaign.target_status.length > 0) {
      query = query.in("rsvp", campaign.target_status);
    }

    const { data: guests, error: guestsError } = await query;

    if (guestsError) {
      throw new Error(`Failed to fetch guests: ${guestsError.message}`);
    }

    console.log(`Found ${guests?.length || 0} guests to send invitations to`);

    // Fetch notification settings for sender email
    const { data: notificationSettings } = await supabase
      .from("notification_settings")
      .select("resend_api_key, email_from_address, email_from_name")
      .eq("user_id", campaign.user_id)
      .single();

    if (!notificationSettings?.resend_api_key || !notificationSettings?.email_from_address) {
      throw new Error("Email provider not configured. Please configure Resend API settings.");
    }

    const resend = new Resend(notificationSettings.resend_api_key);

    // Update campaign status to sending
    await supabase
      .from("rsvp_reminder_campaigns")
      .update({
        status: "sending",
        total_count: guests?.length || 0,
      })
      .eq("id", campaign_id);

    let sentCount = 0;

    // Parse template settings from campaign
    let templateSettings: { template_type?: TemplateType; custom_message?: string; custom_subject?: string } = {};
    try {
      if (campaign.message_template) {
        templateSettings = JSON.parse(campaign.message_template);
      }
    } catch (e) {
      console.log("Could not parse template settings, using defaults");
    }

    const templateType = templateSettings.template_type || 'modern';
    const customSubject = templateSettings.custom_subject || `RSVP for ${event.name}`;

    // Send invitations
    for (const guest of guests || []) {
      try {
        // Generate QR code as base64 data URL
        const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        // Prepare template data
        const templateData: TemplateData = {
          eventName: event.name,
          eventDate: new Date(event.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          eventVenue: event.venue,
          guestFirstName: guest.first_name,
          guestLastName: guest.last_name,
          qrCodeDataUrl,
          eventUrl,
          partner1Name: event.partner1_name,
          partner2Name: event.partner2_name,
          customMessage: templateSettings.custom_message,
          customSubject,
        };

        // Generate HTML based on selected template
        let html: string;
        switch (templateType) {
          case 'elegant':
            html = generateElegantTemplate(templateData);
            break;
          case 'rustic':
            html = generateRusticTemplate(templateData);
            break;
          case 'modern':
          default:
            html = generateModernTemplate(templateData);
            break;
        }

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: `${notificationSettings.email_from_name || 'Wedding Waitress'} <${notificationSettings.email_from_address}>`,
          to: [guest.email],
          subject: customSubject,
          html,
        });

        if (emailError) {
          console.error(`Failed to send email to ${guest.email}:`, emailError);
          
          // Log delivery failure
          await supabase.from("reminder_deliveries").insert({
            campaign_id,
            guest_id: guest.id,
            delivery_method: "email",
            status: "failed",
            error_message: emailError.message || "Unknown error",
            sent_by_user_id: campaign.user_id,
            reminder_type: "initial_invitation",
          });
        } else {
          sentCount++;
          console.log(`Successfully sent invitation to ${guest.email}`);
          
          // Log successful delivery
          await supabase.from("reminder_deliveries").insert({
            campaign_id,
            guest_id: guest.id,
            sent_at: new Date().toISOString(),
            delivery_method: "email",
            status: "delivered",
            sent_by_user_id: campaign.user_id,
            reminder_type: "initial_invitation",
          });
        }

        // Small delay to avoid rate limiting (Resend free tier: 100 emails/day)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing guest ${guest.id}:`, error);
      }
    }

    // Update campaign status to completed
    await supabase
      .from("rsvp_reminder_campaigns")
      .update({
        status: "completed",
        sent_count: sentCount,
      })
      .eq("id", campaign_id);

    console.log(`Initial invitation campaign completed: ${sentCount} sent out of ${guests?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        total_count: guests?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-initial-invitations:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
