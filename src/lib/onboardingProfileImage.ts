import { supabase } from '@/integrations/supabase/client';
import type { GuidedSetupDraft } from '@/lib/guidedEventSetup';

interface SeedResult { status: 'skipped' | 'preserved' | 'copy_required' | 'seeded'; source_path?: string; target_path?: string }
const resolveSeed = async (draftId: string): Promise<SeedResult> => {
  const { data, error } = await supabase.rpc('seed_onboarding_profile_image', { p_draft_id: draftId });
  if (error) throw error;
  const value = data as unknown as SeedResult;
  if (!value || !['skipped', 'preserved', 'copy_required', 'seeded'].includes(value.status)) throw new Error('Profile photo handoff could not be verified.');
  return value;
};

/** A separate private copy, never a shared reference to the event's object. */
export async function seedOnboardingProfileImage(draft: GuidedSetupDraft) {
  if (draft.mode !== 'first_event' || !draft.answers.eventImagePath || draft.completed_at) return;
  const first = await resolveSeed(draft.id);
  if (first.status !== 'copy_required') return;
  const source = first.source_path, target = first.target_path;
  if (source !== draft.answers.eventImagePath || !source?.startsWith(draft.user_id + '/') || target !== `${draft.user_id}/profile-image`) throw new Error('Profile photo ownership could not be verified.');
  const download = await supabase.storage.from('event-branding').download(source);
  if (download.error) throw download.error;
  if (!download.data) throw new Error('The onboarding photo could not be read.');
  const upload = await supabase.storage.from('profile-images').upload(target, download.data, {
    contentType: download.data.type, cacheControl: '0', upsert: false,
    metadata: { onboarding_draft_id: draft.id, source_path: source },
  });
  // Resolve again even after a lost upload response or concurrent duplicate.
  // The database verifies provenance and atomically marks the decision final.
  const final = await resolveSeed(draft.id);
  if (final.status === 'copy_required') throw upload.error || new Error('Your private profile photo could not be copied. Please retry.');
}
