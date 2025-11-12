import { TemplateData } from './types.ts';

export function generateRusticTemplate(data: TemplateData): string {
  const partnerText = data.partner1Name 
    ? `${data.partner1Name}${data.partner2Name ? ` and ${data.partner2Name}` : ''} would love for you to join them at ${data.eventName}.`
    : `You're invited to celebrate at ${data.eventName}.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.customSubject || `RSVP for ${data.eventName}`}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&family=Lora:wght@400;500&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Lora', Georgia, serif; background-color: #e8dcc8;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: linear-gradient(135deg, #F5DEB3 0%, #E8D5B7 100%); border-radius: 0; box-shadow: 0 8px 24px rgba(45, 32, 19, 0.2); border: 3px solid #8B4513; position: relative;">
          
          <!-- Decorative Top Corner -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 15px; background: repeating-linear-gradient(90deg, #8B4513 0px, #8B4513 10px, transparent 10px, transparent 20px); opacity: 0.3;"></div>
            </td>
          </tr>
          
          <!-- Header with Handwritten Style -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; position: relative;">
              <!-- Botanical Top Accent -->
              <div style="margin: 0 0 20px;">
                <div style="display: inline-block; width: 80px; height: 2px; background: linear-gradient(90deg, transparent 0%, #556B2F 50%, transparent 100%);"></div>
                <span style="display: inline-block; margin: 0 10px; color: #556B2F; font-size: 24px;">❀</span>
                <div style="display: inline-block; width: 80px; height: 2px; background: linear-gradient(90deg, transparent 0%, #556B2F 50%, transparent 100%);"></div>
              </div>
              
              <h1 style="margin: 0; color: #2D2013; font-family: 'Dancing Script', cursive; font-size: 48px; font-weight: 600; line-height: 1.2;">
                You're Invited!
              </h1>
              
              <!-- Botanical Bottom Accent -->
              <div style="margin: 20px 0 0;">
                <div style="display: inline-block; width: 80px; height: 2px; background: linear-gradient(90deg, transparent 0%, #556B2F 50%, transparent 100%);"></div>
                <span style="display: inline-block; margin: 0 10px; color: #556B2F; font-size: 24px;">❀</span>
                <div style="display: inline-block; width: 80px; height: 2px; background: linear-gradient(90deg, transparent 0%, #556B2F 50%, transparent 100%);"></div>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 45px 40px;">
              <p style="margin: 0 0 20px; color: #2D2013; font-size: 17px; line-height: 1.8; text-align: center;">
                Dear ${data.guestFirstName} ${data.guestLastName},
              </p>
              
              <p style="margin: 0 0 30px; color: #2D2013; font-size: 16px; line-height: 1.9; text-align: center;">
                ${partnerText}
              </p>
              
              ${data.customMessage ? `
              <div style="margin: 0 0 30px; padding: 20px; background-color: rgba(255, 255, 255, 0.4); border: 2px dashed #8B4513; position: relative;">
                <div style="position: absolute; top: -8px; left: -8px; width: 15px; height: 15px; background: #F5DEB3; border: 2px solid #8B4513; border-radius: 50%;"></div>
                <div style="position: absolute; top: -8px; right: -8px; width: 15px; height: 15px; background: #F5DEB3; border: 2px solid #8B4513; border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -8px; left: -8px; width: 15px; height: 15px; background: #F5DEB3; border: 2px solid #8B4513; border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -8px; right: -8px; width: 15px; height: 15px; background: #F5DEB3; border: 2px solid #8B4513; border-radius: 50%;"></div>
                <p style="margin: 0; color: #2D2013; font-size: 15px; line-height: 1.8; text-align: center; font-style: italic;">
                  ${data.customMessage}
                </p>
              </div>
              ` : ''}
              
              <!-- Event Details with Wood Texture Effect -->
              <div style="background: linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(85, 107, 47, 0.1) 100%); padding: 25px; margin: 0 0 35px; border: 2px solid #8B4513; position: relative;">
                <div style="position: absolute; top: -2px; left: 20px; width: 40px; height: 4px; background-color: #8B4513;"></div>
                <div style="position: absolute; top: -2px; right: 20px; width: 40px; height: 4px; background-color: #8B4513;"></div>
                <div style="position: absolute; bottom: -2px; left: 20px; width: 40px; height: 4px; background-color: #8B4513;"></div>
                <div style="position: absolute; bottom: -2px; right: 20px; width: 40px; height: 4px; background-color: #8B4513;"></div>
                
                <p style="margin: 0 0 12px; color: #2D2013; font-size: 15px; text-align: center;">
                  <span style="font-family: 'Dancing Script', cursive; font-size: 20px; font-weight: 600; color: #556B2F;">Date</span><br/>
                  <span style="font-size: 16px; margin-top: 5px; display: inline-block;">${data.eventDate}</span>
                </p>
                <div style="margin: 15px auto; width: 60px; height: 1px; background: #8B4513;"></div>
                <p style="margin: 0; color: #2D2013; font-size: 15px; text-align: center;">
                  <span style="font-family: 'Dancing Script', cursive; font-size: 20px; font-weight: 600; color: #556B2F;">Venue</span><br/>
                  <span style="font-size: 16px; margin-top: 5px; display: inline-block;">${data.eventVenue}</span>
                </p>
              </div>
              
              <p style="margin: 0 0 25px; color: #2D2013; font-size: 15px; line-height: 1.7; text-align: center;">
                Please scan this code to let us know you'll be there
              </p>
              
              <!-- QR Code with Vintage Stamp Border -->
              <div style="text-align: center; margin: 0 0 35px;">
                <div style="display: inline-block; padding: 15px; background: rgba(255, 255, 255, 0.6); border: 3px dashed #8B4513; position: relative;">
                  <!-- Corner Stamps -->
                  <div style="position: absolute; top: -6px; left: -6px; width: 20px; height: 20px; background: #F5DEB3; border: 2px solid #8B4513; transform: rotate(45deg);"></div>
                  <div style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: #F5DEB3; border: 2px solid #8B4513; transform: rotate(45deg);"></div>
                  <div style="position: absolute; bottom: -6px; left: -6px; width: 20px; height: 20px; background: #F5DEB3; border: 2px solid #8B4513; transform: rotate(45deg);"></div>
                  <div style="position: absolute; bottom: -6px; right: -6px; width: 20px; height: 20px; background: #F5DEB3; border: 2px solid #8B4513; transform: rotate(45deg);"></div>
                  
                  <img src="${data.qrCodeDataUrl}" alt="RSVP QR Code" style="width: 220px; height: 220px; display: block;" />
                </div>
              </div>
              
              <!-- CTA Button with Rustic Style -->
              <div style="text-align: center; margin: 0 0 25px;">
                <a href="${data.eventUrl}" style="display: inline-block; background-color: #8B4513; color: #F5DEB3; text-decoration: none; padding: 14px 40px; border: 2px solid #556B2F; font-size: 15px; font-weight: 500; font-family: 'Dancing Script', cursive; font-size: 20px; box-shadow: 0 4px 8px rgba(45, 32, 19, 0.3);">
                  Let Us Know You're Coming
                </a>
              </div>
              
              <p style="margin: 0; color: #556B2F; font-size: 13px; text-align: center; line-height: 1.6;">
                Can't scan the code? Use this link:<br/>
                <a href="${data.eventUrl}" style="color: #8B4513; text-decoration: none;">${data.eventUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Decorative Bottom Corner -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 15px; background: repeating-linear-gradient(90deg, #8B4513 0px, #8B4513 10px, transparent 10px, transparent 20px); opacity: 0.3;"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: rgba(139, 69, 19, 0.1); padding: 20px; text-align: center; border-top: 2px solid #8B4513;">
              <p style="margin: 0; color: #556B2F; font-size: 11px;">
                Powered by <span style="font-family: 'Dancing Script', cursive; font-size: 14px; font-weight: 600;">Wedding Waitress</span>
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
