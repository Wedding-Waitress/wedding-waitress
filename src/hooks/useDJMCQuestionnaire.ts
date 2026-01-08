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
  CEREMONY_MUSIC_MOMENTS,
  BRIDAL_PARTY_DEFAULTS,
  SPEECH_DEFAULTS,
  MAIN_EVENT_MOMENTS
} from '@/types/djmcQuestionnaire';

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
        section_type: section.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '') as SectionType,
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
          template_type: 'wedding_mr_mrs',
          status: 'draft',
        })
        .select()
        .single();

      if (qError) throw qError;

      // Create default sections
      const defaultSections = [
        { label: 'Ceremony Music', sort_index: 0 },
        { label: 'Bridal Party Introductions', sort_index: 1 },
        { label: 'Speeches', sort_index: 2 },
        { label: 'Main Event Songs', sort_index: 3 },
        { label: 'Background / Dinner Music', sort_index: 4 },
        { label: 'Dance Music', sort_index: 5 },
        { label: 'Traditional / Multicultural Music', sort_index: 6 },
        { label: 'Do Not Play List', sort_index: 7 },
      ];

      const { error: sError } = await supabase
        .from('dj_sections')
        .insert(defaultSections.map(s => ({
          ...s,
          questionnaire_id: q.id,
        })));

      if (sError) throw sError;

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
    saveItem,
    deleteItem,
    reorderItems,
    savePronunciationAudio,
    refetch: fetchQuestionnaire,
  };
};
