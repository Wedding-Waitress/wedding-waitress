import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { invitationHeroUrl, loadInvitationHero, renderInvitationEmail, INVITATION_BRAND_LOGO } from '../../supabase/functions/_shared/invitation-email';

const url = 'https://weddingwaitress.com.au/s/example?invite=' + 'Ab-_9'.repeat(40) + '&source=email';
describe('guest invitation email', () => {
  it.each([null, 'https://example.com/photo.jpg', 'https://example.com/logo.png'])('keeps the entire secure URL in every invitation link: %s', heroUrl => {
    const {html,text} = renderInvitationEmail({eventName:"Hossam & Reema's Wedding", invitationUrl:url, heroUrl});
    const dom = new DOMParser().parseFromString(html,'text/html');
    expect([...dom.querySelectorAll('a')].filter(a=>!a.querySelector('img')).every(a=>a.getAttribute('href')===url)).toBe(true);
    expect(dom.querySelector(`img[src="${INVITATION_BRAND_LOGO}"]`)?.closest('a')?.getAttribute('href')).toBe('https://weddingwaitress.com.au/');
    expect(html).toContain('href="'+url.replaceAll('&','&amp;')+'"');
    expect(text).toContain(url);
    expect(dom.querySelector(`img[src="${INVITATION_BRAND_LOGO}"]`)).not.toBeNull();
    expect(dom.querySelector('h1')?.textContent).toBe("Hossam & Reema's Wedding");
    expect(html).toContain('fillcolor="#397734"');
    expect(html).toContain('bgcolor="#397734"');
    expect(dom.querySelector('html')?.lang).toBe('en');
    expect([...dom.querySelectorAll('table')].every(t=>t.getAttribute('role')==='presentation')).toBe(true);
  });
  it('keeps titles and the RSVP action as HTML text when images are unavailable', () => {
    const {html} = renderInvitationEmail({eventName:'Test Event',invitationUrl:url,heroUrl:'https://example.com/logo.png'});
    const dom = new DOMParser().parseFromString(html,'text/html');
    dom.querySelectorAll('img').forEach(i=>i.remove());
    expect(dom.body.textContent).toContain('Test Event');
    expect(dom.body.textContent).toContain('View Invitation & RSVP');
    expect(html).toContain('background-size:contain');
    expect(html).toContain('width:600px;height:auto');
    expect(html).not.toMatch(/object-fit:cover|background-size:cover/);
  });
  it('escapes event names and image attributes without changing the personal URL', () => {
    const {html} = renderInvitationEmail({eventName:'<img src=x onerror=alert(1)> & "Name"',invitationUrl:url,heroUrl:"https://example.com/a');color:red;.png"});
    const dom = new DOMParser().parseFromString(html,'text/html');
    expect(dom.querySelector('[onerror]')).toBeNull();
    expect(dom.querySelector('h1')?.textContent).toBe('<img src=x onerror=alert(1)> & "Name"');
    expect(html).toContain('a%27%29;color:red;.png');
  });
  it('uses only the currently published hero and respects an explicitly removed image', async () => {
    let current:any = {source:'custom',file_url:'https://example.com/first.jpg'};
    const query:any = {select:vi.fn(()=>query),eq:vi.fn(()=>query),maybeSingle:vi.fn(async()=>({data:{hero_image_config:current},error:null}))};
    const db = {from:vi.fn(()=>query)};
    expect(await loadInvitationHero(db,'event-1')).toBe(current.file_url);
    current = {source:'event',file_url:'https://example.com/new-logo.png'};
    expect(await loadInvitationHero(db,'event-1')).toBe(current.file_url);
    current = {source:'none'};
    expect(await loadInvitationHero(db,'event-1')).toBeNull();
    expect(query.eq).toHaveBeenCalledWith('event_id','event-1');
    expect(db.from).toHaveBeenCalledWith('live_view_module_settings');
    expect(invitationHeroUrl({file_url:'javascript:alert(1)'})).toBeNull();
    expect(invitationHeroUrl(null)).toBeNull();
  });
  it('fails before sending when current artwork cannot be read', async () => {
    const query:any = {select:()=>query,eq:()=>query,maybeSingle:async()=>({error:new Error('offline')})};
    await expect(loadInvitationHero({from:()=>query},'event')).rejects.toThrow('header settings');
  });
  it('supplies multipart content while retaining the existing recipient resolver and sender', () => {
    const sender=readFileSync('supabase/functions/send-rsvp-email/index.ts','utf8');
    expect(sender).toContain('text: textBody');
    expect(sender).toContain('html: htmlBody');
    expect(sender).toContain('resolveRecipientInvitationUrl(adminClient, event_id, event.slug, guest.id)');
    expect(sender).toContain('Wedding Waitress <support@weddingwaitress.com.au>');
    expect(sender.indexOf('loadInvitationHero(adminClient')).toBeLessThan(sender.indexOf('for (const guest'));
  });
});
