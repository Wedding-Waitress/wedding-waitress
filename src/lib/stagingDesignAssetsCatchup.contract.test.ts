import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
const sql=readFileSync('supabase/migrations/20260830261500_staging_design_assets_catchup.sql','utf8');
describe('staging design assets catch-up',()=>{
  it('creates every design table used by the three products',()=>{for(const t of ['signage_settings','signage_gallery_images','signage_categories','signage_image_categories','place_card_gallery_images','place_card_categories','place_card_image_categories','venue_floor_plan_templates'])expect(sql).toContain(`public.${t}`);});
  it('restricts settings and curation writes',()=>{expect(sql).toContain('public.can_access_event((SELECT auth.uid()),event_id)');expect(sql).toContain("public.has_role((SELECT auth.uid()),''admin''::public.app_role)");});
  it('does not seed production media',()=>{expect(sql).not.toContain('xytxkidpourwdbzzwcdp');expect(sql).not.toMatch(/INSERT INTO public\.(signage|place_card).*VALUES/i);});
  it('keeps submitted venue backgrounds private',()=>{expect(sql).toContain("'venue-template-backgrounds','venue-template-backgrounds',false");expect(sql).not.toContain('CREATE POLICY "Public reads venue template backgrounds"');});
});
