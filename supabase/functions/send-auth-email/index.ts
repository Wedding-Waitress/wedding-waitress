/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Branded auth OTP email (logo + brown #967A59 palette). Locked 2026-04-18.
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate branded HTML email template
function generateEmailHtml(firstName: string | null, otp: string, magicLink: string, emailType: string): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  
  let subject = "Your verification code";
  let heading = "Verify your email";
  let description = "Use the code below to verify your email address:";
  
  if (emailType === "signup" || emailType === "email_change") {
    heading = "Welcome to Wedding Waitress!";
    description = "Use the code below to complete your sign up:";
  } else if (emailType === "recovery" || emailType === "magiclink") {
    heading = "Sign in to Wedding Waitress";
    description = "Use the code below to sign in:";
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          <!-- Header with gradient -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid #f0ebe3;">
              <img src="https://xytxkidpourwdbzzwcdp.supabase.co/storage/v1/object/public/email-assets/wedding-waitress-logo-brown.png" alt="Wedding Waitress" width="220" style="max-width: 220px; height: auto; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
                ${heading}
              </h1>
              <p style="margin: 0 0 32px 0; font-size: 16px; color: #71717a; text-align: center;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #52525b; text-align: center;">
                ${description}
              </p>
              
              <!-- OTP Code Display -->
              <div style="background: linear-gradient(135deg, #faf7f2 0%, #f5efe5 100%); border: 2px solid #e8dcc7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #967A59; font-family: 'Courier New', monospace;">
                  ${otp}
                </span>
              </div>
              
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                This code expires in <strong style="color: #71717a;">10 minutes</strong>
              </p>
              
              <!-- Divider -->
              <div style="border-top: 1px solid #e4e4e7; margin: 24px 0;"></div>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a; text-align: center;">
                Or click the button below to sign in directly:
              </p>
              
              <!-- Magic Link Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display: inline-block; background-color: #967A59; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(150, 122, 89, 0.3);">
                      Sign In with Magic Link
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} Wedding Waitress. All rights reserved.
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
}

// Background task to send email (runs after response is sent)
async function sendEmailInBackground(
  userEmail: string,
  userId: string | null,
  otp: string,
  emailType: string,
  redirectTo: string
) {
  const startTime = Date.now();
  console.log("[Background] Starting email send task");

  try {
    // Build magic link using token_hash for proper verification
    const magicLink = `https://xytxkidpourwdbzzwcdp.supabase.co/auth/v1/verify?token=${otp}&type=${emailType}&redirect_to=${encodeURIComponent(redirectTo)}`;

    // Try to get user's first name from profiles table
    let firstName: string | null = null;
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://xytxkidpourwdbzzwcdp.supabase.co";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", userId)
            .single();
          
          if (profile?.first_name) {
            firstName = profile.first_name;
            console.log(`[Background] Found profile name: ${firstName} (${Date.now() - startTime}ms)`);
          }
        }
      } catch (error) {
        console.log("[Background] Could not fetch profile, using default greeting:", error);
      }
    }

    // Generate email subject based on type
    let subject = "Your Wedding Waitress verification code";
    if (emailType === "signup") {
      subject = "Welcome to Wedding Waitress - Verify your email";
    } else if (emailType === "recovery" || emailType === "magiclink") {
      subject = "Sign in to Wedding Waitress";
    } else if (emailType === "email_change") {
      subject = "Confirm your new email address";
    }

    // Generate HTML email
    const htmlContent = generateEmailHtml(firstName, otp, magicLink, emailType);

    // Send email via Resend
    console.log(`[Background] Sending email to ${userEmail} (${Date.now() - startTime}ms)`);
    const emailResponse = await resend.emails.send({
      from: "Wedding Waitress <onboarding@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      console.error("[Background] Resend error:", emailResponse.error);
    } else {
      console.log(`[Background] Email sent successfully: ${emailResponse.data?.id} (${Date.now() - startTime}ms)`);
    }
  } catch (error) {
    console.error("[Background] Error sending email:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  const requestStartTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hookSecret = Deno.env.get("SEND_AUTH_EMAIL_HOOK_SECRET");
    if (!hookSecret) {
      console.error("SEND_AUTH_EMAIL_HOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Hook secret not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Strip the v1,whsec_ prefix as required by standardwebhooks
    const cleanSecret = hookSecret.replace("v1,whsec_", "");

    // Get the raw body for signature verification
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verify the webhook signature using standardwebhooks library
    const wh = new Webhook(cleanSecret);
    let payload: any;
    
    try {
      payload = wh.verify(rawBody, headers);
      console.log(`Webhook verified (${Date.now() - requestStartTime}ms)`);
    } catch (verifyError) {
      console.error("Webhook verification failed:", verifyError);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { user, email_data } = payload;
    const userEmail = user?.email;
    const userId = user?.id;
    const otp = email_data?.token || email_data?.otp || "";
    const emailType = email_data?.email_action_type || "signup";
    const redirectTo = email_data?.redirect_to || "https://weddingwaitress.com.au/dashboard";

    if (!userEmail) {
      console.error("No email address in payload");
      return new Response(JSON.stringify({ error: "No email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Schedule email sending as a background task (does not block response)
    EdgeRuntime.waitUntil(
      sendEmailInBackground(userEmail, userId, otp, emailType, redirectTo)
    );

    // Return immediately to Supabase Auth (well under 5 seconds)
    console.log(`Returning hook response in ${Date.now() - requestStartTime}ms`);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
