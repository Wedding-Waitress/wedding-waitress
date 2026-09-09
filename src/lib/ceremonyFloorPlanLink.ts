import { supabase } from '@/integrations/supabase/client';

export async function linkSavedCeremonyPlan(
  eventId: string,
  currentConfig: Record<string, unknown> | undefined,
  save: (config: Record<string, unknown>) => Promise<void>,
) {
  const { data, error } = await supabase.from('ceremony_floor_plans').select('id').eq('event_id', eventId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Create and save a ceremony floor plan before displaying it to guests.');
  await save({ ...currentConfig, source: 'existing' });
}
