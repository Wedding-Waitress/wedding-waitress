export function buildRSVPNotificationEmail(data: {
  guestName: string;
  oldRsvp: string;
  newRsvp: string;
  eventName: string;
  eventDate: string;
  tableNo?: number;
  isTest?: boolean;
}): { subject: string; html: string } {
  const { guestName, oldRsvp, newRsvp, eventName, eventDate, tableNo, isTest } = data;
  
  // Determine emoji and color
  const statusConfig: Record<string, { emoji: string; color: string; label: string }> = {
    'Attending': { emoji: '✅', color: '#10b981', label: 'Accepted' },
    'Not Attending': { emoji: '❌', color: '#ef4444', label: 'Declined' },
    'Pending': { emoji: '🔄', color: '#f59e0b', label: 'Pending' },
  };
  
  const status = statusConfig[newRsvp] || statusConfig['Pending'];
  
  const subject = `${status.emoji} RSVP Update: ${guestName}${isTest ? ' (Test)' : ''}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header with purple gradient -->
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
          ${status.emoji} RSVP Update${isTest ? ' (Test)' : ''}
        </h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
          Hello! You have a new RSVP update for <strong>${eventName}</strong>:
        </p>
        
        <!-- Guest Card -->
        <div style="background-color: #f9fafb; border-left: 4px solid ${status.color}; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px; font-size: 20px; color: #1f2937;">
            ${guestName}
          </h2>
          <p style="margin: 0; font-size: 16px; color: #6b7280;">
            <strong>Status:</strong> 
            <span style="color: ${status.color}; font-weight: 600;">
              ${oldRsvp} → ${status.label}
            </span>
          </p>
          ${tableNo ? `
            <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;">
              <strong>Table:</strong> ${tableNo}
            </p>
          ` : ''}
        </div>
        
        <!-- Event Details -->
        <div style="margin: 30px 0; padding: 20px; background-color: #faf5ff; border-radius: 8px;">
          <h3 style="margin: 0 0 10px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            Event Details
          </h3>
          <p style="margin: 0; font-size: 16px; color: #1f2937;">
            <strong>${eventName}</strong><br>
            ${new Date(eventDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <!-- Action Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://weddingwaitress.com/dashboard" 
             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Guest List →
          </a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          You're receiving this because you enabled RSVP notifications in your Wedding Waitress settings.
        </p>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          <a href="https://weddingwaitress.com/dashboard" style="color: #8b5cf6; text-decoration: none;">
            Manage notification preferences
          </a>
        </p>
        <div style="margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; font-weight: 600;">Wedding Waitress</p>
        </div>
      </td>
    </tr>
    
  </table>
</body>
</html>
  `;
  
  return { subject, html };
}
