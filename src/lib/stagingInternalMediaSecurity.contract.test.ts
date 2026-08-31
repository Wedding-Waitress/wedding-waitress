import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260830251500_staging_internal_media_security_hardening.sql',
  'utf8',
);

describe('staging internal media security hardening', () => {
  it('removes direct browser execution from the like-count trigger helper', () => {
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.sync_event_media_like_count()\nFROM PUBLIC, anon, authenticated',
    );
  });

  it.each([
    'event_media_seq_counters',
    'media_password_rate_limits',
  ])('keeps %s inaccessible through the Data API', (table) => {
    expect(migration).toContain(`REVOKE ALL ON TABLE public.${table}`);
    expect(migration).toMatch(
      new RegExp(`ON public\\.${table}[\\s\\S]*?FOR ALL[\\s\\S]*?USING \\(false\\)[\\s\\S]*?WITH CHECK \\(false\\)`),
    );
  });
});
