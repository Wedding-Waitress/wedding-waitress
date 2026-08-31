import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
const sql=readFileSync('supabase/migrations/20260830263000_staging_seating_suggestions.sql','utf8');
const fn=readFileSync('supabase/functions/generate-seating-suggestions/index.ts','utf8');
describe('staging seating suggestions',()=>{
  it('protects suggestions with event access',()=>{expect(sql).toContain('public.can_access_event((SELECT auth.uid()),event_id)');expect(sql).toContain("status IN('pending','accepted','rejected')");});
  it('never sends staging guests to an external AI gateway',()=>{expect(fn).toContain("const isStaging = supabaseUrl.includes('ufmpxsgncmvgrvvlqtuj')");expect(fn).toContain("if (isStaging || !lovableApiKey)");});
  it('uses family grouping then remaining capacity',()=>{expect(fn).toContain('Keeps this family group together.');expect(fn).toContain('most available seats.');expect(fn).toContain("source: 'private_rules'");});
});
