import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260824093431_event_budget_planner.sql'), 'utf8');
const currencyMigration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260824104241_expand_event_budget_currencies.sql'), 'utf8');
const categoryOnlyMigration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260824110219_allow_category_only_budget_expenses.sql'), 'utf8');

describe('event budget persistence migration', () => {
  it('uses exact non-negative money storage and one budget per event', () => {
    expect(migration).toContain('anticipated_budget numeric(14,2)');
    expect(migration).toContain('estimated_cost numeric(14,2)');
    expect(migration).toContain('actual_cost numeric(14,2)');
    expect(migration).toContain('amount_paid numeric(14,2)');
    expect(migration).toMatch(/UNIQUE \(event_id\)/);
    expect(migration.match(/CHECK \([^)]*(?:cost|budget|paid)[^)]*>= 0/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('cascades from events, assigns the authoritative owner and protects both tables with event-aware RLS', () => {
    expect(migration.match(/REFERENCES public\.events\(id\) ON DELETE CASCADE/g)).toHaveLength(2);
    expect(migration).toContain('NEW.user_id := event_owner_id');
    expect(migration).toContain('public.can_access_event(auth.uid(), NEW.event_id)');
    expect(migration.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(2);
    expect(migration.match(/public\.can_access_event\(\(SELECT auth\.uid\(\)\), event_id\)/g)?.length).toBeGreaterThanOrEqual(8);
    expect(migration).toContain('GRANT SELECT, INSERT, UPDATE, DELETE');
    expect(migration).not.toMatch(/TO anon\s*;/);
  });

  it('expands only the currency constraint while preserving AUD as the default and all security objects', () => {
    expect(currencyMigration).toContain("ALTER COLUMN currency SET DEFAULT 'AUD'");
    expect(currencyMigration).toContain('DROP CONSTRAINT IF EXISTS event_budget_settings_currency_check');
    expect(currencyMigration).toContain("currency IN ('AUD', 'USD', 'GBP', 'EUR')");
    expect(currencyMigration).toContain('VALIDATE CONSTRAINT event_budget_settings_currency_check');
    expect(currencyMigration).not.toMatch(/CREATE TABLE|DROP TABLE|CREATE POLICY|DROP POLICY|REVOKE|GRANT/);
  });

  it('allows category-only expenses without removing legacy data or changing security objects', () => {
    expect(categoryOnlyMigration).toContain('DROP CONSTRAINT IF EXISTS event_budget_expenses_name_or_vendor_check');
    expect(categoryOnlyMigration).not.toMatch(/DROP COLUMN|DELETE FROM|UPDATE\s+public\.event_budget_expenses/);
    expect(categoryOnlyMigration).not.toMatch(/CREATE POLICY|DROP POLICY|REVOKE|GRANT|DISABLE ROW LEVEL SECURITY/);
  });
});
