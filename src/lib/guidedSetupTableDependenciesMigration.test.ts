import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260902091154_guided_setup_table_dependencies.sql'),
  'utf8',
);
const rollback = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/rollback/20260902091154_guided_setup_table_dependencies.rollback.sql'),
  'utf8',
);

describe('Guided Setup table dependency migration', () => {
  it('adds only the two required fields with safe existing-row defaults', () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS table_purpose text NOT NULL DEFAULT 'standard'/i);
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS head_seating_order jsonb NOT NULL DEFAULT '\[\]'::jsonb/i);
    expect(migration).toMatch(/SET table_purpose = 'standard'\s+WHERE table_purpose IS NULL/i);
    expect(migration).toMatch(/SET head_seating_order = '\[\]'::jsonb\s+WHERE head_seating_order IS NULL/i);
  });

  it('enforces supported purposes, Head Table geometry and array seating order', () => {
    expect(migration).toContain("CHECK (table_purpose IN ('standard', 'head'))");
    expect(migration).toContain("CHECK (table_purpose <> 'head' OR table_type = 'long')");
    expect(migration).toContain("CHECK (jsonb_typeof(head_seating_order) = 'array')");
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_one_head_per_event[\s\S]*WHERE table_purpose = 'head'/);
  });

  it('is transactional and does not alter RLS, ownership, functions or unrelated schemas', () => {
    expect(migration).toMatch(/BEGIN;[\s\S]*COMMIT;/);
    expect(migration).toContain("SET LOCAL lock_timeout = '5s'");
    expect(migration).toContain("SET LOCAL statement_timeout = '60s'");
    expect(migration).not.toMatch(/CREATE (?:OR REPLACE )?FUNCTION|CREATE POLICY|DROP POLICY|ROW LEVEL SECURITY/i);
    expect(migration).not.toMatch(/ceremony_floor_plans|reception_floor_plans|user_subscriptions|storage\./i);
  });

  it('has a focused rollback for exactly the introduced index, constraints and columns', () => {
    expect(rollback).toContain('DROP INDEX IF EXISTS public.uq_tables_one_head_per_event');
    for (const constraint of [
      'tables_head_seating_order_array_check',
      'tables_head_geometry_check',
      'tables_table_purpose_check',
    ]) expect(rollback).toContain(`DROP CONSTRAINT IF EXISTS ${constraint}`);
    expect(rollback).toContain('DROP COLUMN IF EXISTS head_seating_order');
    expect(rollback).toContain('DROP COLUMN IF EXISTS table_purpose');
  });
});
