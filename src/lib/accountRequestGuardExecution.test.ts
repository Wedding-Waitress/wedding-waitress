import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PostgREST request guard execution', () => {
  it('allows API roles to run the existing no-result guard without changing access rules', () => {
    const migration = readFileSync('supabase/migrations/20260913053000_account_request_guard_execution.sql', 'utf8');
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.guard_suspended_data_request\(\) TO anon, authenticated, service_role;/);
    expect(migration).not.toMatch(/CREATE|REPLACE|DISABLE|DROP|GRANT\s+ALL/i);
    expect(migration).not.toMatch(/GRANT[\s\S]*private\./i);
  });
});
