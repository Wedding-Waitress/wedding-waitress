/** Email-only renderer. No webpage CSS, token generation, or delivery side effects. */
export const INVITATION_BRAND_LOGO = 'https://weddingwaitress.com.au/wedding-waitress-logo-dark-brown.png';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

/** Live View renders the saved hero_image_config.file_url, including custom
 * overrides and the event photo/logo published by syncEventHeroImage.
 * Do not fall back to a private event image when the owner removed the hero. */
export function invitationHeroUrl(config: unknown): string | null {
  if (!config || typeof config !== 'object') return null;
  const value = (config as { file_url?: unknown }).file_url;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !/[\r\n\x00]/.test(value) ? value : null;
  } catch { return null; }
}

export async function loadInvitationHero(db: any, eventId: string): Promise<string | null> {
  const { data, error } = await db.from('live_view_module_settings')
    .select('hero_image_config').eq('event_id', eventId).maybeSingle();
  if (error) throw new Error('The invitation header settings could not be loaded.');
  return invitationHeroUrl(data?.hero_image_config);
}

export function renderInvitationEmail(input: { eventName: string; invitationUrl: string; heroUrl?: string | null }) {
  const name = escapeHtml(input.eventName.trim());
  // Escape the attribute, never re-create, shorten, or strip the recipient URL.
  const link = escapeHtml(input.invitationUrl);
  const hero = invitationHeroUrl({ file_url: input.heroUrl });
  const image = hero ? escapeHtml(hero) : null;
  const heading = `<p style="margin:0 0 12px;color:#ffffff;font-family:Arial,sans-serif;font-size:20px;line-height:28px;text-align:center;">You're Invited</p><h1 style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:normal;line-height:42px;text-align:center;overflow-wrap:break-word;">${name}</h1>`;
  // Classic Outlook uses a proportional inline image and a solid title band.
  // This deliberately avoids background-image dependence and logo cropping.
  const outlookHeader = image ? `<!--[if mso]><tr><td align="center" bgcolor="#fffaf4" style="background-color:#fffaf4;"><a href="${link}" style="color:#2f1b14;"><img src="${image}" width="600" alt="View invitation for ${name}" border="0" style="display:block;width:600px;height:auto;border:0;color:#2f1b14;" /></a></td></tr><tr><td align="center" bgcolor="#2f1b14" style="padding:32px 24px;background-color:#2f1b14;"><a href="${link}" style="color:#ffffff;text-decoration:none;">${heading}</a></td></tr><![endif]-->` : '';
  const background = image ? `background="${image}"` : '';
  const modernStyle = image
    ? `background-image:url('${escapeHtml(hero!.replace(/[\x27\x28\x29\\]/g, c => '%' + c.charCodeAt(0).toString(16)))}');background-position:center;background-repeat:no-repeat;background-size:contain;`
    : 'background-image:linear-gradient(145deg,#553827 0%,#2f1b14 55%,#150c08 100%);';
  const headerColor = image ? '#fffaf4' : '#2f1b14';
  const titleBackground = image ? 'background-color:#2f1b14;background-color:rgba(47,27,20,0.78);' : '';
  const header = `${outlookHeader}${image ? '<!--[if !mso]><!-->' : ''}<tr><td ${background} align="center" bgcolor="${headerColor}" style="background-color:${headerColor};${modernStyle}color:#ffffff;text-align:center;">
  <a href="${link}" style="display:block;padding:100px 24px;color:#ffffff;text-decoration:none;text-align:center;">
    <div style="padding:20px 12px;${titleBackground}color:#ffffff;">${heading}</div>
  </a></td></tr>${image ? '<!--<![endif]-->' : ''}`;
  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>You're Invited — ${name}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head><body style="margin:0;padding:0;background-color:#eee9e3;color:#2f1b14;">
<div lang="en" dir="ltr"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#eee9e3" style="background-color:#eee9e3;"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fffaf4" style="width:100%;max-width:600px;background-color:#fffaf4;color:#2f1b14;border-collapse:collapse;">
${header}
<tr><td align="center" bgcolor="#fffaf4" style="padding:32px 12px;background-color:#fffaf4;color:#2f1b14;">
<!--[if mso]><v:roundrect href="${link}" style="height:54px;v-text-anchor:middle;width:276px;" arcsize="16%" strokecolor="#397734" fillcolor="#397734"><w:anchorlock xmlns:w="urn:schemas-microsoft-com:office:word"/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">View Invitation &amp; RSVP</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" bgcolor="#397734" style="background-color:#397734;border-radius:8px;box-shadow:inset 0 1px 0 #91b68b,inset 0 -2px 0 #285424;"><a href="${link}" style="display:inline-block;border:1px solid #397734;border-radius:8px;padding:16px 22px;background-color:#397734;color:#ffffff;font-family:Arial,sans-serif;font-size:18px;line-height:22px;font-weight:bold;text-align:center;text-decoration:none;">View Invitation &amp; RSVP</a></td></tr></table><!--<![endif]-->
</td></tr>
<tr><td align="center" bgcolor="#fffaf4" style="padding:4px 24px 32px;background-color:#fffaf4;color:#2f1b14;text-align:center;">
<a href="https://weddingwaitress.com.au/" target="_blank" style="display:block;color:#2f1b14;text-decoration:none;"><img src="${INVITATION_BRAND_LOGO}" width="360" alt="Wedding Waitress — Your Wedding &amp; Event Assistant" border="0" style="display:block;width:100%;max-width:360px;height:auto;margin:0 auto;border:0;color:#2f1b14;font-family:Arial,sans-serif;font-size:20px;line-height:28px;text-align:center;" /></a>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></div></body></html>`;
  const text = `You're Invited\n${input.eventName.trim()}\n\nView Invitation & RSVP:\n${input.invitationUrl}\n\nWedding Waitress — Your Wedding & Event Assistant\nhttps://weddingwaitress.com.au/\n`;
  return { html, text };
}
