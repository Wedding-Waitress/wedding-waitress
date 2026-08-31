import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260830223000_floor_plan_staging_catchup.sql',
  'utf8',
);

describe('floor-plan staging catch-up security contract', () => {
  it('is forward-only and establishes both final floor-plan tables idempotently', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.ceremony_floor_plans');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.reception_floor_plans');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS table_type');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS table_purpose');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS head_seating_order');
  });

  it('authorises CRUD through event access and protects update destinations', () => {
    const eventChecks = migration.match(/public\.can_access_event\(\(SELECT auth\.uid\(\)\), event_id\)/g) ?? [];
    expect(eventChecks.length).toBeGreaterThanOrEqual(10);
    expect(migration).toMatch(
      /CREATE POLICY "Accessible events can update ceremony floor plans"[\s\S]*?USING[\s\S]*?WITH CHECK/,
    );
    expect(migration).toMatch(
      /CREATE POLICY "Accessible events can update reception floor plans"[\s\S]*?USING[\s\S]*?WITH CHECK/,
    );
  });

  it('keeps reception backgrounds private and scopes objects to accessible events', () => {
    expect(migration).toContain("'reception-floor-plan-backgrounds'");
    expect(migration).toMatch(/ON CONFLICT \(id\) DO UPDATE SET\s+public = false/);
    expect(migration).toContain('(storage.foldername(name))[2]');
    expect(migration).toContain('(storage.foldername(name))[1] = (SELECT auth.uid())::text');
    expect(migration).toMatch(
      /CREATE POLICY "Reception backgrounds event update"[\s\S]*?USING[\s\S]*?WITH CHECK/,
    );
  });

  it('exposes only gated public readers with explicit grants', () => {
    expect(migration).toContain('e.qr_apply_to_live_view = true');
    expect(migration).toContain('WHERE share_token = _token');
    expect(migration).toContain('AND share_enabled = true');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.get_public_ceremony_floor_plan(text) FROM PUBLIC');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.get_reception_floor_plan_by_share_token(text) FROM PUBLIC');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.get_reception_share_background_signed_url(text) FROM PUBLIC');
  });

  it('keeps Head Table semantics in the token-gated Reception payload', () => {
    expect(migration).toContain("'table_type', t.table_type");
    expect(migration).toContain("'table_purpose', t.table_purpose");
    expect(migration).toContain("'head_seating_order', t.head_seating_order");
    expect(migration).toContain("WHERE table_purpose = 'head'");
  });
});
