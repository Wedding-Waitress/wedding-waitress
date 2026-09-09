export interface GuestAdditionEmailInput {
  eventName: string
  addedByName: string
  addedGuestName: string
  groupChoice: 'separate' | 'group'
  guestId: string
}

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

export const guestAdditionEmailIdempotencyKey = (notificationId: string) =>
  `guest-addition/${notificationId}`

const EMAIL_LOGO_URL = 'https://xytxkidpourwdbzzwcdp.supabase.co/storage/v1/object/public/email-assets/wedding-waitress-logo-brown.png'

export const buildGuestAdditionEmail = (input: GuestAdditionEmailInput) => {
  const eventName = escapeHtml(input.eventName)
  const addedByName = escapeHtml(input.addedByName)
  const addedGuestName = escapeHtml(input.addedGuestName)
  const groupDescription = input.groupChoice === 'group'
    ? 'as part of their group'
    : 'as a separate guest'
  const dashboardUrl = `https://weddingwaitress.com.au/dashboard?tab=guest-list&amp;guest=${encodeURIComponent(input.guestId)}`

  return {
    subject: `${input.addedByName} added ${input.addedGuestName} to ${input.eventName}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A guest was added</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#432619;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${addedByName} added ${addedGuestName} to ${eventName}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:520px;border-collapse:separate;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px;text-align:center;border-bottom:1px solid #f0ebe3;">
              <img src="${EMAIL_LOGO_URL}" alt="Wedding Waitress" width="220" style="display:block;width:220px;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 10px;font-size:26px;line-height:1.25;font-weight:650;color:#18181b;text-align:center;">A guest was added</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#71717a;text-align:center;">There is a new guest to review in your Wedding Waitress Guest List.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;background-color:#faf7f2;border:1px solid #e8dcc7;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 8px;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#967a59;">${eventName}</p>
                    <p style="margin:0;font-size:16px;line-height:1.65;color:#432619;"><strong>${addedByName}</strong> added <strong>${addedGuestName}</strong> ${groupDescription}.</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#967a59;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:20px;padding:14px 32px;border-radius:8px;box-shadow:0 4px 12px rgba(150,122,89,0.3);">Review guest</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#a1a1aa;text-align:center;">You can turn these alerts off from the Guest List notification panel.</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;text-align:center;">&copy; ${new Date().getFullYear()} Wedding Waitress. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  }
}
