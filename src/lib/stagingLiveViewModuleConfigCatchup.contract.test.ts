import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    'supabase/migrations/20260830273000_staging_live_view_module_config_catchup.sql',
  ),
  'utf8',
);

describe('staging Live View module configuration catch-up', () => {
  it.each([
    'floor_plan_config',
    'menu_config',
    'hero_image_config',
    'reception_floor_plan_config',
  ])('adds and backfills %s', (column) => {
    expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column} jsonb`);
    expect(migration).toContain(`${column} = COALESCE(${column}, '{}'::jsonb)`);
  });

  it('does not weaken Live View ownership or RLS', () => {
    expect(migration).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]*(?:true|1\s*=\s*1)/i);
    expect(migration).not.toMatch(/GRANT\s+ALL/i);
  });
});
