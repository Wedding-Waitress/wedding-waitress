import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  buildCanonicalGuestSeatingUrl,
  buildRecipientInvitationUrl,
  resolveRecipientInvitationUrl,
  resolveCanonicalGuestSeatingUrl,
} from '../../supabase/functions/_shared/public-rsvp-link.ts';

const baseUrl = 'https://weddingwaitress.com.au';

function activeQrQuery(code: string | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: code ? { code } : null, error: null });
  const limit = vi.fn(() => ({ maybeSingle }));
  const active = vi.fn(() => ({ limit }));
  const event = vi.fn(() => ({ eq: active }));
  const select = vi.fn(() => ({ eq: event }));
  return { select, maybeSingle };
}

describe('RSVP invitation public seating links', () => {
  it('uses the same event-scoped dynamic QR format as the QR Code Seating Chart', async () => {
    const query = activeQrQuery('HOSSAMQR');
    const admin = {
      from: vi.fn(() => ({ select: query.select, insert: vi.fn() })),
      rpc: vi.fn(),
    } as any;

    await expect(resolveCanonicalGuestSeatingUrl(admin, 'event-hossam', 'owner-hossam', baseUrl))
      .resolves.toBe('https://weddingwaitress.com.au/qr/HOSSAMQR');
    expect(query.select).toHaveBeenCalledWith('code');
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(buildCanonicalGuestSeatingUrl(baseUrl, 'a/b c')).toBe('https://weddingwaitress.com.au/qr/a%2Fb%20c');
  });

  it('creates a durable QR destination for a legacy event with no existing QR', async () => {
    const query = activeQrQuery(null);
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const admin = {
      from: vi.fn(() => ({ select: query.select, insert })),
      rpc: vi.fn().mockResolvedValue({ data: 'NEWCODE', error: null }),
    } as any;

    await expect(resolveCanonicalGuestSeatingUrl(admin, 'event-legacy', 'owner-legacy', baseUrl))
      .resolves.toBe('https://weddingwaitress.com.au/qr/NEWCODE');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      current_event_id: 'event-legacy', user_id: 'owner-legacy', destination_type: 'guest_lookup',
    }));
  });

  it('keeps the public route outside authentication and preserves invalid-event handling', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const guestLookup = readFileSync('src/pages/GuestLookup.tsx', 'utf8');
    expect(app).toContain('<Route path="/qr/:code" element={<QRRedirect />} />');
    expect(app).toContain('<Route path="/s/:eventSlug" element={<GuestLookup />} />');
    expect(guestLookup).toContain("get_public_event_with_data_secure");
    expect(guestLookup).toContain('Event Not Found');
  });

  it('uses an opaque recipient link for each invitation while retaining QR links for public seating', async () => {
    const durableToken = 'A'.repeat(43);
    const admin = { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: durableToken, error: null }) } as any;
    await expect(resolveRecipientInvitationUrl(admin, 'event-hossam', 'hossam-reemas-wedding', 'guest-nader', baseUrl))
      .resolves.toBe(`https://weddingwaitress.com.au/s/hossam-reemas-wedding?invite=${durableToken}`);
    expect(buildRecipientInvitationUrl(baseUrl, 'event name', 'a/b c')).toBe('https://weddingwaitress.com.au/s/event%20name?invite=a%2Fb%20c');
    expect(admin.rpc).toHaveBeenCalledWith('get_or_create_guest_invitation_token', expect.objectContaining({
      _event_id: 'event-hossam',
      _guest_id: 'guest-nader',
      _candidate_token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    }));
    for (const source of [
      readFileSync('supabase/functions/send-rsvp-sms/index.ts', 'utf8'),
      readFileSync('supabase/functions/send-rsvp-email/index.ts', 'utf8'),
    ]) {
      expect(source).toContain("resolveRecipientInvitationUrl");
      expect(source).toContain('guest.id');
    }
  });

  it('uses the same database-owned token when SMS and email resolve concurrently', async () => {
    const durableToken = 'B'.repeat(43);
    const admin = {
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: durableToken, error: null }),
    } as any;

    const [smsUrl, emailUrl] = await Promise.all([
      resolveRecipientInvitationUrl(admin, 'event-hossam', 'hossam-reemas-wedding', 'guest-nader', baseUrl),
      resolveRecipientInvitationUrl(admin, 'event-hossam', 'hossam-reemas-wedding', 'guest-nader', baseUrl),
    ]);

    expect(smsUrl).toBe(emailUrl);
    expect(smsUrl).toContain(`invite=${durableToken}`);
    expect(admin.rpc).toHaveBeenCalledTimes(2);
  });
});
