import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260830220000_staging_budget_dynamic_qr_catchup.sql'),
  'utf8',
);

describe('staging Budget and Dynamic QR catch-up migration', () => {
  it('is a forward-only idempotent reconciliation and excludes billing', () => {
    expect(migration.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(4);
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS');
    expect(migration).toContain('CREATE SEQUENCE IF NOT EXISTS');
    expect(migration).not.toMatch(/user_subscriptions|stripe|payment_intents|checkout/i);
  });

  it('matches the final Budget contract and delegates event access centrally', () => {
    expect(migration).toContain("currency IN ('AUD', 'USD', 'GBP', 'EUR')");
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS event_budget_expenses_name_or_vendor_check');
    expect(migration).toContain('NEW.user_id := event_owner_id');
    expect(migration.match(/public\.can_access_event/g)?.length).toBeGreaterThanOrEqual(10);
    expect(migration.match(/event_budget_settings FOR (?:SELECT|INSERT|UPDATE|DELETE) TO authenticated/g)).toHaveLength(4);
    expect(migration.match(/event_budget_expenses FOR (?:SELECT|INSERT|UPDATE|DELETE) TO authenticated/g)).toHaveLength(4);
  });

  it('uses grants and RLS as separate least-privilege layers', () => {
    expect(migration.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(4);
    expect(migration).toContain('REVOKE ALL ON TABLE public.event_budget_settings, public.event_budget_expenses FROM anon, authenticated');
    expect(migration).toContain('REVOKE ALL ON TABLE public.dynamic_qr_codes, public.qr_scan_logs FROM anon, authenticated');
    expect(migration).toContain('GRANT SELECT ON TABLE public.qr_scan_logs TO authenticated');
    expect(migration).not.toMatch(/GRANT (?:SELECT|INSERT|UPDATE|DELETE)[^;]* TO anon/);
  });

  it('closes the QR generator race and restricts privileged RPCs', () => {
    expect(migration).toContain("CHECK (code ~ '^[0-9A-Za-z]{6}$') NOT VALID");
    expect(migration).toContain('VALIDATE CONSTRAINT dynamic_qr_codes_destination_type_check');
    expect(migration).toContain('MAXVALUE 56800235583');
    expect(migration).toContain("nextval('public.dynamic_qr_code_sequence')");
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS dynamic_qr_codes_code_uidx');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.generate_dynamic_qr_code() FROM PUBLIC, anon');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.generate_dynamic_qr_code() TO authenticated');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.resolve_dynamic_qr(text) FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.resolve_dynamic_qr(text) TO service_role');
  });

  it('prevents QR ownership reassignment and validates event links on writes', () => {
    expect(migration).toContain('NEW.user_id := actor_id');
    expect(migration).toContain("RAISE EXCEPTION 'A QR code owner cannot be changed'");
    expect(migration).toContain('public.can_access_event(actor_id, NEW.current_event_id)');
    expect(migration).toContain('QR owners update codes for accessible events');
    expect(migration).toContain('QR owners and event managers read scan logs');
  });
});
