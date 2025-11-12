import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "npm:resend@2.0.0";
import QRCode from "npm:qrcode@1.5.3";

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

        // Build personalized email HTML
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP for ${event.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">You're Invited!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Dear ${guest.first_name} ${guest.last_name},
              </p>
              
              <p style="margin: 0 0 30px; color: #555555; font-size: 16px; line-height: 1.6;">
                ${event.partner1_name}${event.partner2_name ? ` and ${event.partner2_name}` : ''} request the pleasure of your company at their ${event.name}.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 0 0 30px;">
                <p style="margin: 0 0 10px; color: #333333; font-size: 14px;"><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                <p style="margin: 0; color: #333333; font-size: 14px;"><strong>Venue:</strong> ${event.venue}</p>
              </div>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6; text-align: center;">
                Please scan this QR code or click the button below to RSVP:
              </p>
              
              <!-- QR Code -->
              <div style="text-align: center; margin: 0 0 30px;">
                <img src="${qrCodeDataUrl}" alt="RSVP QR Code" style="width: 250px; height: 250px; border: 4px solid #667eea; border-radius: 8px;" />
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 0 0 20px;">
                <a href="${eventUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                  View My RSVP Details
                </a>
              </div>
              
              <p style="margin: 0; color: #888888; font-size: 14px; text-align: center; line-height: 1.5;">
                Can't scan the QR code? Click the button above or copy this link:<br/>
                <a href="${eventUrl}" style="color: #667eea; text-decoration: none;">${eventUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #888888; font-size: 12px;">
                Powered by <strong>Wedding Waitress</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: `${notificationSettings.email_from_name || 'Wedding Waitress'} <${notificationSettings.email_from_address}>`,
          to: [guest.email],
          subject: `RSVP for ${event.name}`,
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
