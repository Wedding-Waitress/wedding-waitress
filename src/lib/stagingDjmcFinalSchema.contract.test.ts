import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260830253000_staging_djmc_final_schema.sql','utf8');

describe('staging DJ/MC final schema', () => {
  it('creates all four RLS-protected tables', () => {
    for (const table of ['dj_mc_questionnaires','dj_mc_sections','dj_mc_items','dj_mc_share_tokens']) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it('authorizes owner workflows through event access', () => {
    expect(sql).toContain('public.can_access_event((SELECT auth.uid()),event_id)');
    expect(sql).toContain("_permission NOT IN ('view_only','can_edit')");
    expect(sql).toContain('_validity_days NOT BETWEEN 1 AND 365');
  });

  it('strictly validates public reorder arrays', () => {
    expect(sql).toContain('count(DISTINCT x)');
    expect(sql).toContain('expected<>COALESCE(array_length(item_ids,1),0)');
  });

  it('does not duplicate private pronunciation recordings', () => {
    expect(sql).toMatch(/SELECT i\.section_id,i\.row_label,i\.value_text,i\.music_url,i\.song_title_artist,NULL,i\.duration/);
    expect(sql).toMatch(/SELECT n\.id,row_label,value_text,music_url,song_title_artist,NULL,duration/);
  });

  it('only exposes token RPCs publicly', () => {
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION %s TO anon, authenticated");
    expect(sql).toContain('REVOKE ALL ON public.dj_mc_questionnaires,public.dj_mc_sections,public.dj_mc_items,public.dj_mc_share_tokens FROM PUBLIC,anon');
  });
});
