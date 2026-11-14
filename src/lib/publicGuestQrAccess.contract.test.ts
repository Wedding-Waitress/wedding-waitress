import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('public guest QR access contract', () => {
  it('keeps the pre-request guard executable for anonymous public QR guests without granting tables', () => {
    const migration = readFileSync('supabase/migrations/20260920041652_restore_anonymous_public_guest_guard.sql', 'utf8');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.guard_suspended_data_request() TO anon;');
    expect(migration).not.toMatch(/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE|public\.)/i);
  });

  it('uses the cache-busting brown brand asset for both static and Helmet social images', () => {
    const html = readFileSync('index.html', 'utf8');
    const seo = readFileSync('src/components/SEO/SeoHead.tsx', 'utf8');
    const image = 'https://weddingwaitress.com.au/wedding-waitress-social-preview-20260920.png';
    expect(html).toContain(image);
    expect(seo).toContain('wedding-waitress-social-preview-20260920.png');
    expect(html).toContain('og:image:width');
    expect(html).toContain('og:image:height');
  });

  it('cannot leave public event loading blocked by an optional timezone read or an unbounded RPC', () => {
    const guestLookup = readFileSync('src/pages/GuestLookup.tsx', 'utf8');
    expect(guestLookup).toContain('controller.abort()');
    expect(guestLookup).toContain('.abortSignal(signal)');
    expect(guestLookup).toContain('15_000');
    expect(guestLookup).toContain('useGuestVerification');
    expect(guestLookup).not.toContain(".select('event_timezone')");
    expect(guestLookup).not.toMatch(/const \{ data: tzData \} = await supabase\s*\.from\('events'\)/);
  });
});
