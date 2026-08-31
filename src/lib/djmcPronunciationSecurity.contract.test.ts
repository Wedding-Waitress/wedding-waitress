import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260830214500_secure_djmc_pronunciation_recordings.sql', 'utf8');
const recorder = readFileSync('src/components/Dashboard/DJMCQuestionnaire/DJMCPronunciationRecorder.tsx', 'utf8');
const mediaFunction = readFileSync('supabase/functions/djmc-pronunciation-media/index.ts', 'utf8');

describe('DJ/MC pronunciation security contract', () => {
  it('uses a dedicated private bucket with strict owner-only CRUD policies', () => {
    expect(migration).toContain("'djmc-pronunciations'");
    expect(migration).toMatch(/'djmc-pronunciations',[\s\S]*?false,[\s\S]*?5242880/);
    expect(migration).toContain('FOR SELECT TO authenticated');
    expect(migration).toContain('FOR INSERT TO authenticated');
    expect(migration).toContain('FOR DELETE TO authenticated');
    expect(migration).toContain('q.user_id=(SELECT auth.uid())');
    expect(migration).not.toMatch(/pronunciation recordings" ON storage\.objects[^;]+TO anon/i);
  });

  it('stores scoped paths and never creates permanent public URLs', () => {
    expect(recorder).not.toContain("from('venue-logos')");
    expect(recorder).not.toContain('getPublicUrl');
    expect(recorder).toContain('createDJMCPronunciationSignedUrl');
    expect(migration).toContain('validate_djmc_pronunciation_path');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS pronunciation_audio_path');
    expect(migration).not.toMatch(/UPDATE public\.dj_mc_items[\s\S]*pronunciation_audio_url\s*=\s*NULL/i);
    expect(migration).toContain("st.token=rtrim(share_token,'=')");
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.get_dj_mc_questionnaire_by_token(text) TO anon,authenticated',
    );
  });

  it('verifies owner or live share-token permission before service-role media access', () => {
    expect(mediaFunction).toContain('const hasOwnerAccess=callerId===questionnaire.user_id');
    expect(mediaFunction).toContain("if(!hasOwnerAccess&&!sharePermission) return json({error:'Not authorised'},403)");
    expect(mediaFunction).toContain("sharePermission!=='can_edit'");
    expect(mediaFunction).toContain(".eq('questionnaire_id',questionnaire.id)");
    expect(mediaFunction).toContain(".eq('token',shareToken)");
    expect(mediaFunction).toContain("consume_djmc_pronunciation_rate_limit");
    expect(mediaFunction).toContain("return json({error:'Too many recording requests. Please wait and try again.'},429)");
    expect(mediaFunction).toContain(".select('id').maybeSingle()");
    expect(mediaFunction).toContain("await admin.storage.from(BUCKET).remove([path])");
    expect(mediaFunction).toContain("if(attachError||!attached)");
    expect(mediaFunction).toContain("await admin.from('dj_mc_items').update({[column]:requestedPath})");
  });
});
