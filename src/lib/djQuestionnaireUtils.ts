import { supabase } from '@/integrations/supabase/client';

/**
 * Shift all items at or after a given sort_index down by 1
 */
export const shiftItemsDown = async (sectionId: string, fromIndex: number) => {
  const { data: items, error: fetchError } = await supabase
    .from('dj_items')
    .select('id, sort_index')
    .eq('section_id', sectionId)
    .gte('sort_index', fromIndex)
    .order('sort_index', { ascending: true });

  if (fetchError) throw fetchError;
  if (!items || items.length === 0) return;

  // Update each item's sort_index
  for (const item of items) {
    await supabase
      .from('dj_items')
      .update({ sort_index: item.sort_index + 1 })
      .eq('id', item.id);
  }
};

/**
 * Reindex all items in a section to ensure sequential sort_index values
 */
export const reindexSectionItems = async (sectionId: string) => {
  const { data: items, error: fetchError } = await supabase
    .from('dj_items')
    .select('id')
    .eq('section_id', sectionId)
    .order('sort_index', { ascending: true });

  if (fetchError) throw fetchError;
  if (!items) return;

  // Update each item with sequential sort_index
  for (let i = 0; i < items.length; i++) {
    await supabase
      .from('dj_items')
      .update({ sort_index: i })
      .eq('id', items[i].id);
  }
};

/**
 * Create a blank row item
 */
export const createBlankRow = async (
  sectionId: string,
  type: string,
  sortIndex: number
) => {
  const { data, error } = await supabase
    .from('dj_items')
    .insert({
      section_id: sectionId,
      type,
      prompt: 'New Row',
      sort_index: sortIndex,
      required: false,
      meta: {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get the maximum sort_index for a section
 */
export const getMaxSortIndex = async (sectionId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('dj_items')
    .select('sort_index')
    .eq('section_id', sectionId)
    .order('sort_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.sort_index ?? -1;
};
