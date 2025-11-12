import { TemplateData } from './types.ts';

export function generateElegantTemplate(data: TemplateData): string {
  const partnerText = data.partner1Name 
    ? `${data.partner1Name}${data.partner2Name ? ` and ${data.partner2Name}` : ''} request the pleasure of your company at their ${data.eventName}.`
    : `You are cordially invited to ${data.eventName}.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.customSubject || `RSVP for ${data.eventName}`}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Lato:wght@300;400&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Lato', -apple-system, sans-serif; background-color: #f5f0e8;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #FFFFF0; border-radius: 0; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); border: 1px solid #D4AF37;">
          
          <!-- Ornate Top Border -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 4px; background: linear-gradient(90deg, #FFFFF0 0%, #D4AF37 20%, #D4AF37 80%, #FFFFF0 100%);"></div>
            </td>
          </tr>
          
          <!-- Header with Decorative Elements -->
          <tr>
            <td style="padding: 50px 40px 30px; text-align: center; position: relative;">
              <div style="border-top: 1px solid #D4AF37; border-bottom: 1px solid #D4AF37; padding: 20px 0; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #2C2416; font-family: 'Playfair Display', Georgia, serif; font-size: 36px; font-weight: 400; letter-spacing: 2px; line-height: 1.3;">
                  You're Cordially<br/>Invited
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 50px 40px;">
              <p style="margin: 0 0 25px; color: #2C2416; font-size: 16px; line-height: 1.8; text-align: center; font-weight: 300;">
                Dear ${data.guestFirstName} ${data.guestLastName},
              </p>
              
              <p style="margin: 0 0 35px; color: #2C2416; font-size: 17px; line-height: 1.9; text-align: center; font-weight: 300;">
                ${partnerText}
              </p>
              
              ${data.customMessage ? `
              <p style="margin: 0 0 35px; color: #2C2416; font-size: 16px; line-height: 1.8; text-align: center; font-style: italic; font-weight: 300; padding: 20px; background-color: #FAF8F5; border-left: 3px solid #D4AF37; border-right: 3px solid #D4AF37;">
                ${data.customMessage}
              </p>
              ` : ''}
              
              <!-- Event Details Box -->
              <div style="background-color: #FAF8F5; padding: 25px; margin: 0 0 35px; border: 1px solid #D4AF37; position: relative;">
                <div style="position: absolute; top: -1px; left: -1px; width: 20px; height: 20px; border-top: 2px solid #8B7355; border-left: 2px solid #8B7355;"></div>
                <div style="position: absolute; top: -1px; right: -1px; width: 20px; height: 20px; border-top: 2px solid #8B7355; border-right: 2px solid #8B7355;"></div>
                <div style="position: absolute; bottom: -1px; left: -1px; width: 20px; height: 20px; border-bottom: 2px solid #8B7355; border-left: 2px solid #8B7355;"></div>
                <div style="position: absolute; bottom: -1px; right: -1px; width: 20px; height: 20px; border-bottom: 2px solid #8B7355; border-right: 2px solid #8B7355;"></div>
                
                <p style="margin: 0 0 12px; color: #2C2416; font-size: 15px; text-align: center;">
                  <span style="font-family: 'Playfair Display', Georgia, serif; font-weight: 600; color: #8B7355; letter-spacing: 1px;">DATE</span><br/>
                  <span style="font-size: 16px; margin-top: 5px; display: inline-block;">${data.eventDate}</span>
                </p>
                <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%); margin: 15px 0;"></div>
                <p style="margin: 0; color: #2C2416; font-size: 15px; text-align: center;">
                  <span style="font-family: 'Playfair Display', Georgia, serif; font-weight: 600; color: #8B7355; letter-spacing: 1px;">VENUE</span><br/>
                  <span style="font-size: 16px; margin-top: 5px; display: inline-block;">${data.eventVenue}</span>
                </p>
              </div>
              
              <p style="margin: 0 0 25px; color: #2C2416; font-size: 15px; line-height: 1.7; text-align: center; font-weight: 300;">
                Please scan the code below or use the link to confirm your attendance
              </p>
              
              <!-- QR Code with Decorative Frame -->
              <div style="text-align: center; margin: 0 0 35px;">
                <div style="display: inline-block; padding: 20px; background: #FAF8F5; border: 3px solid #D4AF37; position: relative;">
                  <div style="position: absolute; top: -6px; left: -6px; width: 30px; height: 30px; border-top: 3px solid #8B7355; border-left: 3px solid #8B7355;"></div>
                  <div style="position: absolute; top: -6px; right: -6px; width: 30px; height: 30px; border-top: 3px solid #8B7355; border-right: 3px solid #8B7355;"></div>
                  <div style="position: absolute; bottom: -6px; left: -6px; width: 30px; height: 30px; border-bottom: 3px solid #8B7355; border-left: 3px solid #8B7355;"></div>
                  <div style="position: absolute; bottom: -6px; right: -6px; width: 30px; height: 30px; border-bottom: 3px solid #8B7355; border-right: 3px solid #8B7355;"></div>
                  <img src="${data.qrCodeDataUrl}" alt="RSVP QR Code" style="width: 220px; height: 220px; display: block;" />
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 0 0 25px;">
                <a href="${data.eventUrl}" style="display: inline-block; background-color: #FFFFF0; color: #2C2416; text-decoration: none; padding: 14px 45px; border: 2px solid #D4AF37; font-size: 15px; font-weight: 400; letter-spacing: 2px; font-family: 'Playfair Display', Georgia, serif; transition: all 0.3s;">
                  CONFIRM ATTENDANCE
                </a>
              </div>
              
              <p style="margin: 0; color: #8B7355; font-size: 13px; text-align: center; line-height: 1.6;">
                Unable to scan? Visit this link:<br/>
                <a href="${data.eventUrl}" style="color: #D4AF37; text-decoration: none; font-weight: 400;">${data.eventUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Decorative Bottom Border -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 4px; background: linear-gradient(90deg, #FFFFF0 0%, #D4AF37 20%, #D4AF37 80%, #FFFFF0 100%);"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 20px; text-align: center; border-top: 1px solid #D4AF37;">
              <p style="margin: 0; color: #8B7355; font-size: 11px; letter-spacing: 1px;">
                Powered by <span style="font-family: 'Playfair Display', Georgia, serif; font-weight: 600;">Wedding Waitress</span>
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
