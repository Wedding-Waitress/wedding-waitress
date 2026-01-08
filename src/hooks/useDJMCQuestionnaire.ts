import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  DJMCQuestionnaire, 
  DJMCSection, 
  DJMCItem, 
  DJMCQuestionnaireWithData,
  SectionType,
  ItemData,
} from '@/types/djmcQuestionnaire';
import { SECTION_DEFINITIONS } from '@/types/djmcQuestionnaire';

export const useDJMCQuestionnaire = (eventId: string | null) => {
  const [questionnaire, setQuestionnaire] = useState<DJMCQuestionnaireWithData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchQuestionnaire = useCallback(async () => {
    if (!eventId) {
      setQuestionnaire(null);
      return;
    }

    setLoading(true);
    try {
      // Get questionnaire for this event
      const { data: q, error: qError } = await supabase
        .from('dj_questionnaires')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (qError) throw qError;

      if (!q) {
        setQuestionnaire(null);
        setLoading(false);
        return;
      }

      // Get sections
      const { data: sections, error: sError } = await supabase
        .from('dj_sections')
        .select('*')
        .eq('questionnaire_id', q.id)
        .order('sort_index');

      if (sError) throw sError;

      // Get items for all sections
      const sectionIds = (sections || []).map(s => s.id);
      const { data: items, error: iError } = await supabase
        .from('dj_items')
        .select('*')
        .in('section_id', sectionIds)
        .order('sort_index');

      if (iError) throw iError;

      // Get answers for all items
      const itemIds = (items || []).map(i => i.id);
      const { data: answers, error: aError } = await supabase
        .from('dj_answers')
        .select('*')
        .in('item_id', itemIds);

      if (aError) throw aError;

      // Map answers to items
      const answersMap = new Map((answers || []).map(a => [a.item_id, a]));

      // Build the full structure
      const sectionsWithItems = (sections || []).map(section => ({
        ...section,
        section_type: section.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') as SectionType,
        items: (items || [])
          .filter(item => item.section_id === section.id)
          .map(item => {
            const answer = answersMap.get(item.id);
            return {
              id: item.id,
              section_id: item.section_id,
              sort_index: item.sort_index,
              item_type: item.type,
              data: (answer?.value || item.meta || {}) as unknown as ItemData,
              pronunciation_audio_url: (item.meta as Record<string, unknown>)?.pronunciation_audio_url as string | null || null,
            } as DJMCItem;
          }),
      })) as (DJMCSection & { items: DJMCItem[] })[];

      setQuestionnaire({
        id: q.id,
        event_id: q.event_id,
        created_by: q.created_by,
        template_type: q.template_type as 'wedding' | 'event',
        status: q.status as 'draft' | 'sent' | 'approved',
        recipient_emails: q.recipient_emails,
        notes: q.notes,
        created_at: q.created_at || '',
        updated_at: q.updated_at || '',
        header_overrides: q.header_overrides as any,
        sections: sectionsWithItems,
      });
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questionnaire',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  const createQuestionnaire = async (): Promise<boolean> => {
    if (!eventId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create questionnaire
      const { data: q, error: qError } = await supabase
        .from('dj_questionnaires')
        .insert({
          event_id: eventId,
          created_by: user.id,
          template_type: 'wedding',
          status: 'draft',
        })
        .select()
        .single();

      if (qError) throw qError;

      // Create sections with instructions
      const sectionsToInsert = SECTION_DEFINITIONS.map(s => ({
        questionnaire_id: q.id,
        label: s.label,
        sort_index: s.sort_index,
        instructions: s.instructions,
      }));

      const { data: createdSections, error: sError } = await supabase
        .from('dj_sections')
        .insert(sectionsToInsert)
        .select();

      if (sError) throw sError;

      // Create default items for each section
      const itemsToInsert: Array<{
        section_id: string;
        type: string;
        prompt: string;
        sort_index: number;
        meta: any;
      }> = [];

      const answersToInsert: Array<{
        item_id: string;
        value: any;
      }> = [];

      // Map section labels to created section IDs
      const sectionMap = new Map(createdSections.map(s => [s.label, s.id]));

      for (const sectionDef of SECTION_DEFINITIONS) {
        const sectionId = sectionMap.get(sectionDef.label);
        if (!sectionId) continue;

        for (const itemDef of sectionDef.defaultItems) {
          itemsToInsert.push({
            section_id: sectionId,
            type: itemDef.type,
            prompt: '',
            sort_index: itemDef.sort_index,
            meta: itemDef.data,
          });
        }
      }

      if (itemsToInsert.length > 0) {
        const { data: createdItems, error: iError } = await supabase
          .from('dj_items')
          .insert(itemsToInsert)
          .select();

        if (iError) throw iError;

        // Create answers for each item with the default data
        if (createdItems && createdItems.length > 0) {
          for (const item of createdItems) {
            answersToInsert.push({
              item_id: item.id,
              value: item.meta || {},
            });
          }

          const { error: aError } = await supabase
            .from('dj_answers')
            .insert(answersToInsert);

          if (aError) throw aError;
        }
      }

      toast({
        title: 'Success',
        description: 'Questionnaire created successfully',
      });

      await fetchQuestionnaire();
      return true;
    } catch (error) {
      console.error('Error creating questionnaire:', error);
      toast({
        title: 'Error',
        description: 'Failed to create questionnaire',
        variant: 'destructive',
      });
      return false;
    }
  };

  const resetQuestionnaire = async (): Promise<boolean> => {
    if (!eventId || !questionnaire) return false;

    try {
      // Delete existing questionnaire (cascade will delete sections, items, answers)
      const { error: deleteError } = await supabase
        .from('dj_questionnaires')
        .delete()
        .eq('id', questionnaire.id);

      if (deleteError) throw deleteError;

      // Create new questionnaire with defaults
      const success = await createQuestionnaire();
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Questionnaire reset to defaults',
        });
      }

      return success;
    } catch (error) {
      console.error('Error resetting questionnaire:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset questionnaire',
        variant: 'destructive',
      });
      return false;
    }
  };

  const saveItem = async (sectionId: string, itemId: string | null, data: ItemData, itemType: string): Promise<string | null> => {
    try {
      if (itemId) {
        // Update existing item's answer
        const { error } = await supabase
          .from('dj_answers')
          .upsert({
            item_id: itemId,
            value: data as any,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'item_id' });

        if (error) throw error;
        return itemId;
      } else {
        // Create new item
        const { data: items } = await supabase
          .from('dj_items')
          .select('sort_index')
          .eq('section_id', sectionId)
          .order('sort_index', { ascending: false })
          .limit(1);

        const nextIndex = items && items.length > 0 ? items[0].sort_index + 1 : 0;

        const { data: newItem, error: iError } = await supabase
          .from('dj_items')
          .insert({
            section_id: sectionId,
            type: itemType,
            prompt: '',
            sort_index: nextIndex,
            meta: data as any,
          })
          .select()
          .single();

        if (iError) throw iError;

        // Create answer
        await supabase
          .from('dj_answers')
          .insert({
            item_id: newItem.id,
            value: data as any,
          });

        return newItem.id;
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save item',
        variant: 'destructive',
      });
      return null;
    }
  };

  const duplicateItem = async (sectionId: string, itemId: string): Promise<boolean> => {
    try {
      // Get the item to duplicate
      const { data: originalItem, error: fetchError } = await supabase
        .from('dj_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      // Get the answer for this item
      const { data: originalAnswer } = await supabase
        .from('dj_answers')
        .select('*')
        .eq('item_id', itemId)
        .maybeSingle();

      // Get current max sort_index
      const { data: items } = await supabase
        .from('dj_items')
        .select('sort_index')
        .eq('section_id', sectionId)
        .order('sort_index', { ascending: false })
        .limit(1);

      const nextIndex = items && items.length > 0 ? items[0].sort_index + 1 : 0;

      // Create duplicate item
      const { data: newItem, error: insertError } = await supabase
        .from('dj_items')
        .insert({
          section_id: sectionId,
          type: originalItem.type,
          prompt: originalItem.prompt,
          sort_index: nextIndex,
          meta: originalItem.meta,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create answer for duplicate
      if (originalAnswer) {
        await supabase
          .from('dj_answers')
          .insert({
            item_id: newItem.id,
            value: originalAnswer.value,
          });
      }

      await fetchQuestionnaire();
      return true;
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate row',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteItem = async (itemId: string): Promise<boolean> => {
    try {
      // Delete answer first
      await supabase
        .from('dj_answers')
        .delete()
        .eq('item_id', itemId);

      // Delete item
      const { error } = await supabase
        .from('dj_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await fetchQuestionnaire();
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const reorderItems = async (sectionId: string, orderedItemIds: string[]): Promise<boolean> => {
    try {
      // Update sort_index for each item
      const updates = orderedItemIds.map((id, index) => 
        supabase
          .from('dj_items')
          .update({ sort_index: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      await fetchQuestionnaire();
      return true;
    } catch (error) {
      console.error('Error reordering items:', error);
      return false;
    }
  };

  const savePronunciationAudio = async (itemId: string, audioBlob: Blob): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `pronunciations/${user.id}/${itemId}_${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(fileName);

      // Update item meta with audio URL
      await supabase
        .from('dj_items')
        .update({
          meta: { pronunciation_audio_url: publicUrl },
        })
        .eq('id', itemId);

      return publicUrl;
    } catch (error) {
      console.error('Error saving pronunciation audio:', error);
      toast({
        title: 'Error',
        description: 'Failed to save pronunciation recording',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    fetchQuestionnaire();
  }, [fetchQuestionnaire]);

  return {
    questionnaire,
    loading,
    createQuestionnaire,
    resetQuestionnaire,
    saveItem,
    duplicateItem,
    deleteItem,
    reorderItems,
    savePronunciationAudio,
    refetch: fetchQuestionnaire,
  };
};
