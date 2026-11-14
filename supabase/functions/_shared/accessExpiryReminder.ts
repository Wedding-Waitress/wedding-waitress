const EMAIL_LOGO_URL = 'https://xytxkidpourwdbzzwcdp.supabase.co/storage/v1/object/public/email-assets/wedding-waitress-logo-brown.png'
const EXTEND_URL = 'https://weddingwaitress.com.au/account/plan-billing'

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;')

export const formatExpiryDate = (expiresAt: string) => new Intl.DateTimeFormat('en-AU', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Melbourne',
}).format(new Date(expiresAt))

export const accessExpiryReminderKey = (userId: string, expiresAt: string, channel: string) =>
  `access-expiry/${userId}/${expiresAt}/${channel}`

export const buildAccessExpiryEmail = (expiresAt: string) => {
  const expiry = escapeHtml(formatExpiryDate(expiresAt))
  return {
    subject: `Your Wedding Waitress access expires on ${formatExpiryDate(expiresAt)}`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f4f5;font-family:Segoe UI,Tahoma,sans-serif;color:#432619"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #f0ebe3"><img src="${EMAIL_LOGO_URL}" alt="Wedding Waitress" width="220" style="display:block;max-width:100%;height:auto;margin:auto"></td></tr><tr><td style="padding:40px"><h1 style="margin:0 0 12px;color:#18181b;text-align:center;font-size:26px">Your access expires in 30 days</h1><p style="margin:0 0 24px;text-align:center;line-height:1.6;color:#71717a">Your paid Wedding Waitress access expires on <strong>${expiry}</strong>.</p><div style="padding:22px;background:#faf7f2;border:1px solid #e8dcc7;border-radius:12px;line-height:1.65">Extend access for one month or any number of whole months at <strong>A$22 per month including GST</strong>, paid upfront. Your saved information remains preserved while access is inactive.</div><p style="margin:28px 0 0;text-align:center"><a href="${EXTEND_URL}" style="display:inline-block;padding:14px 28px;background:#967a59;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Extend access</a></p></td></tr><tr><td style="padding:22px 40px;text-align:center;background:#fafafa;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px">This is an operational account notice and does not use your Guest List communication credits.<br>&copy; ${new Date().getFullYear()} Wedding Waitress.</td></tr></table></td></tr></table></body></html>`,
  }
}

export const buildAccessExpirySms = (expiresAt: string) =>
  `Wedding Waitress: Your paid access expires on ${formatExpiryDate(expiresAt)}. Extend for one month or any number of whole months at A$22/month including GST, paid upfront: ${EXTEND_URL}`
