import { TemplateData } from './types.ts';

export function generateModernTemplate(data: TemplateData): string {
  const partnerText = data.partner1Name 
    ? `${data.partner1Name}${data.partner2Name ? ` and ${data.partner2Name}` : ''} request the pleasure of your company at their ${data.eventName}.`
    : `You are invited to ${data.eventName}.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.customSubject || `RSVP for ${data.eventName}`}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15); overflow: hidden;">
          
          <!-- Bold Gradient Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center; position: relative;">
              <div style="position: absolute; top: 20px; right: 20px; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; filter: blur(30px);"></div>
              <div style="position: absolute; bottom: 20px; left: 20px; width: 100px; height: 100px; background: rgba(255, 255, 255, 0.08); border-radius: 50%; filter: blur(40px);"></div>
              <h1 style="margin: 0; color: #ffffff; font-size: 40px; font-weight: 700; letter-spacing: -1px; position: relative;">You're Invited!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 45px 40px;">
              <p style="margin: 0 0 20px; color: #1a1a1a; font-size: 17px; line-height: 1.6; font-weight: 400;">
                Hi ${data.guestFirstName},
              </p>
              
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.7; font-weight: 300;">
                ${partnerText}
              </p>
              
              ${data.customMessage ? `
              <div style="margin: 0 0 30px; padding: 20px; background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%); border-left: 4px solid #667eea; border-radius: 8px;">
                <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.7; font-weight: 300;">
                  ${data.customMessage}
                </p>
              </div>
              ` : ''}
              
              <!-- Event Details Card -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 12px; margin: 0 0 35px;">
                <div style="background-color: #ffffff; padding: 25px; border-radius: 10px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <div style="flex: 1; text-align: center;">
                      <p style="margin: 0 0 8px; color: #667eea; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Date</p>
                      <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">${data.eventDate}</p>
                    </div>
                  </div>
                  <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e0e0e0 50%, transparent 100%); margin: 15px 0;"></div>
                  <div style="text-align: center;">
                    <p style="margin: 0 0 8px; color: #667eea; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Venue</p>
                    <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">${data.eventVenue}</p>
                  </div>
                </div>
              </div>
              
              <p style="margin: 0 0 25px; color: #555555; font-size: 15px; line-height: 1.6; text-align: center; font-weight: 400;">
                Scan the QR code or click below to RSVP
              </p>
              
              <!-- QR Code with Modern Border -->
              <div style="text-align: center; margin: 0 0 35px;">
                <div style="display: inline-block; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);">
                  <div style="background: #ffffff; padding: 15px; border-radius: 12px;">
                    <img src="${data.qrCodeDataUrl}" alt="RSVP QR Code" style="width: 220px; height: 220px; display: block;" />
                  </div>
                </div>
              </div>
              
              <!-- Bold CTA Button -->
              <div style="text-align: center; margin: 0 0 25px;">
                <a href="${data.eventUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); letter-spacing: 0.5px;">
                  RSVP NOW
                </a>
              </div>
              
              <p style="margin: 0; color: #888888; font-size: 13px; text-align: center; line-height: 1.6;">
                Can't scan the code? Copy this link:<br/>
                <a href="${data.eventUrl}" style="color: #667eea; text-decoration: none; font-weight: 500;">${data.eventUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #666666; font-size: 12px; font-weight: 500;">
                Powered by <strong style="color: #667eea;">Wedding Waitress</strong>
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
