import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260830250000_staging_advisor_security_hardening.sql',
  'utf8',
);

describe('staging advisor security hardening', () => {
  it('removes direct browser execution from internal slug helpers', () => {
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.ensure_event_slug() FROM PUBLIC, anon, authenticated',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.generate_slug(text) FROM PUBLIC, anon, authenticated',
    );
  });

  it('keeps the organiser report authenticated and unavailable anonymously', () => {
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.get_events_with_guest_count() FROM PUBLIC, anon',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.get_events_with_guest_count() TO authenticated',
    );
  });

  it('does not revoke the intentional public guest-token APIs', () => {
    expect(migration).not.toContain('get_guest_by_token');
    expect(migration).not.toContain('get_public_event_with_data_secure');
    expect(migration).not.toContain('update_guest_with_token');
  });
});
