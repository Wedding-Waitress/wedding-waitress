import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260830263000_staging_seating_suggestions.sql', 'utf8');
const fn = readFileSync('supabase/functions/generate-seating-suggestions/index.ts', 'utf8');

describe('seating suggestion privacy fallback', () => {
  it('protects suggestions with event access', () => {
    expect(sql).toContain('public.can_access_event((SELECT auth.uid()),event_id)');
    expect(sql).toContain("status IN('pending','accepted','rejected')");
  });

  it('always uses private rules without an external AI gateway', () => {
    expect(fn).not.toContain('ai.gateway.lovable.dev');
    expect(fn).not.toContain('LOVABLE_API_KEY');
    expect(fn).not.toContain('await fetch(');
  });

  it('uses family grouping then remaining capacity', () => {
    expect(fn).toContain('Keeps this family group together.');
    expect(fn).toContain('most available seats.');
    expect(fn).toContain("source: 'private_rules'");
  });
});
