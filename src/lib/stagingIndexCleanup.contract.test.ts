import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const sql=readFileSync('supabase/migrations/20260830260000_staging_index_and_internal_rls_cleanup.sql','utf8');
describe('staging index and internal RLS cleanup',()=>{
  it('drops only duplicate non-constraint indexes',()=>{
    expect(sql).toContain('DROP INDEX IF EXISTS public.dynamic_qr_codes_code_uidx');
    expect(sql).toContain('DROP INDEX IF EXISTS public.event_budget_settings_event_id_uidx');
    expect(sql).toContain('DROP INDEX IF EXISTS public.idx_events_slug_unique');
    expect(sql).not.toContain('DROP INDEX IF EXISTS public.dynamic_qr_codes_code_key');
  });
  it('covers important foreign keys',()=>{
    expect(sql).toContain('idx_guests_table_id');
    expect(sql).toContain('idx_event_collaborators_user_id');
    expect(sql).toContain('idx_dj_mc_questionnaires_user_id');
  });
  it('makes the service-only rate table explicitly deny all',()=>{
    expect(sql).toContain('ON public.djmc_pronunciation_rate_limits FOR ALL USING(false) WITH CHECK(false)');
  });
});
