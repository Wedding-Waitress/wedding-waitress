import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260903120801_subscription_download_only_window.sql'), 'utf8');
const payment = fs.readFileSync(path.join(root, 'supabase/functions/verify-payment/index.ts'), 'utf8');

describe('subscription download-only lifecycle contract', () => {
  it('creates a distinct 30-day window without replacing retention grace', () => {
    expect(migration).toContain("download_only_ends_at");
    expect(migration).toContain("expires_at + interval '30 days'");
    expect(migration).toContain('BEFORE INSERT OR UPDATE OF expires_at, download_only_ends_at');
    expect(migration).toContain("'grace_period'");
    expect(migration).toContain("'expired'");
    expect(migration).not.toContain('DROP COLUMN grace_period_ends_at');
  });

  it('denies event mutations after active access while leaving selects untouched', () => {
    expect(migration).toContain('guard_expired_event_mutation');
    expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE');
    expect(migration).not.toContain('BEFORE SELECT');
    expect(migration).toContain('Paid planning access has ended. This account is download-only.');
  });

  it('exposes lifecycle actions only to authenticated users', () => {
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.refresh_my_subscription_lifecycle() FROM public, anon;',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.refresh_my_subscription_lifecycle() TO authenticated;',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.extend_starter_trial_once() FROM public, anon;',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.subscription_allows_event_edit(uuid) FROM public, anon, authenticated;',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.guard_expired_event_mutation() FROM public, anon, authenticated;',
    );
  });

  it('sets the download end date for purchases and extensions', () => {
    expect(payment.match(/download_only_ends_at/g)?.length).toBeGreaterThanOrEqual(3);
    expect(payment.match(/setDate\(downloadOnlyEndsAt\.getDate\(\) \+ 30\)/g)?.length).toBe(2);
  });
});
