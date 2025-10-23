import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJQuestionnaire, DJQuestionnaireWithData, DJSection, DJItem, DJAnswer, TemplateType, ItemType, QuestionnaireStatus } from '@/types/djQuestionnaire';
import { DJ_TEMPLATES } from '@/lib/djQuestionnaireTemplates';
import { debounce } from 'lodash-es';
import { shiftItemsDown, reindexSectionItems, createBlankRow, getMaxSortIndex } from '@/lib/djQuestionnaireUtils';

export type { TemplateType } from '@/types/djQuestionnaire';

export const useDJQuestionnaire = (eventId: string | null) => {
  const [questionnaire, setQuestionnaire] = useState<DJQuestionnaireWithData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  const fetchQuestionnaire = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      // Fetch questionnaire
      const { data: qData, error: qError } = await supabase
        .from('dj_questionnaires')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (qError) throw qError;
      if (!qData) {
        setQuestionnaire(null);
        return;
      }

      // Fetch sections
      const { data: sections, error: sError } = await supabase
        .from('dj_sections')
        .select('*')
        .eq('questionnaire_id', qData.id)
        .order('sort_index', { ascending: true });

      if (sError) throw sError;

      // Fetch items for all sections (with guard for empty array)
      const sectionIds = sections?.map(s => s.id) || [];
      let items = [];
      if (sectionIds.length > 0) {
        const { data: itemsData, error: iError } = await supabase
          .from('dj_items')
          .select('*')
          .in('section_id', sectionIds)
          .order('sort_index', { ascending: true });

        if (iError) throw iError;
        items = itemsData || [];
      }

      // Fetch answers for all items (with guard for empty array)
      const itemIds = items?.map(i => i.id) || [];
      let answers = [];
      if (itemIds.length > 0) {
        const { data: answersData, error: aError } = await supabase
          .from('dj_answers')
          .select('*')
          .in('item_id', itemIds);

        if (aError) throw aError;
        answers = answersData || [];
      }

      // Build nested structure with proper type casting
      const answersMap = new Map<string, DJAnswer>(
        answers?.map(a => [a.item_id, a as DJAnswer]) ?? []
      );
      const itemsMap = new Map<string, (DJItem & { answer?: DJAnswer })[]>();
      
      items?.forEach(item => {
        if (!itemsMap.has(item.section_id)) {
          itemsMap.set(item.section_id, []);
        }
        itemsMap.get(item.section_id)!.push({
          ...item,
          type: item.type as ItemType,
          meta: (item.meta ?? {}) as Record<string, any>,
          answer: answersMap.get(item.id)
        });
      });

      const sectionsWithItems = sections?.map(section => ({
        ...section,
        recommendations: (section.recommendations ?? {}) as Record<string, any>,
        items: itemsMap.get(section.id) || []
      })) as (DJSection & { items: (DJItem & { answer?: DJAnswer })[] })[] || [];

      setQuestionnaire({
        ...qData,
        template_type: qData.template_type as TemplateType,
        status: qData.status as QuestionnaireStatus,
        header_overrides: (qData.header_overrides ?? {}) as Record<string, any>,
        recipient_emails: qData.recipient_emails || [],
        sections: sectionsWithItems
      } as DJQuestionnaireWithData);
    } catch (error: any) {
      console.error('Error fetching questionnaire:', error);
      toast({
        title: "Error",
        description: "Failed to load questionnaire",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuestionnaireFromTemplate = async (templateType: TemplateType) => {
    if (!eventId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create questionnaire
      const { data: newQ, error: qError } = await supabase
        .from('dj_questionnaires')
        .insert({
          event_id: eventId,
          template_type: templateType,
          created_by: user.id,
          status: 'draft',
          meta: {
            sectionVisibility: {
              'Ceremony Music': true,
              'Bridal Party Introductions': true,
              'Speeches': true,
              'Main Event Songs': true,
              'Background / Dinner Music': true,
              'Dance Music': true,
              'Traditional / Multicultural Music': true,
              'Do not play songs': true
            }
          }
        })
        .select()
        .single();

      if (qError) throw qError;

      // Get template
      const template = DJ_TEMPLATES[templateType];

      // Create sections and items
      for (const [index, sectionTemplate] of template.sections.entries()) {
        const { data: newSection, error: sError } = await supabase
          .from('dj_sections')
          .insert({
            questionnaire_id: newQ.id,
            label: sectionTemplate.label,
            instructions: sectionTemplate.instructions,
            recommendations: sectionTemplate.recommendations || {},
            sort_index: index
          })
          .select()
          .single();

        if (sError) throw sError;

        // Create items for this section
        const itemsToInsert = sectionTemplate.items.map((item, itemIndex) => ({
          section_id: newSection.id,
          type: item.type,
          prompt: item.prompt,
          help_text: item.help_text || null,
          required: item.required || false,
          sort_index: itemIndex,
          meta: item.meta || {}
        }));

        const { error: iError } = await supabase
          .from('dj_items')
          .insert(itemsToInsert);

        if (iError) throw iError;
      }

      await fetchQuestionnaire();

      toast({
        title: "Success",
        description: "Questionnaire created from template",
      });
    } catch (error: any) {
      console.error('Error creating questionnaire:', error);
      toast({
        title: "Error",
        description: "Failed to create questionnaire",
        variant: "destructive",
      });
    }
  };

  const debouncedSave = debounce(async (itemId: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dj_answers')
        .upsert({
          item_id: itemId,
          value: value,
          answered_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'item_id'
        });

      if (error) throw error;

      setHasUnsavedChanges(false);

      toast({
        title: "Saved",
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Error saving answer:', error);
      toast({
        title: "Save failed",
        variant: "destructive",
      });
    }
  }, 600);

  const saveAnswer = async (itemId: string, value: any) => {
    if (!itemId) {
      console.error('Cannot save answer: itemId is missing');
      return;
    }
    setHasUnsavedChanges(true);
    debouncedSave(itemId, value);
  };

  const updateStatus = async (status: DJQuestionnaire['status']) => {
    if (!questionnaire) return;

    try {
      const { error } = await supabase
        .from('dj_questionnaires')
        .update({ status })
        .eq('id', questionnaire.id);

      if (error) throw error;

      await fetchQuestionnaire();

      toast({
        title: "Success",
        description: `Status updated to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchQuestionnaire();
  }, [eventId]);

  const updateHeaderOverrides = async (overrides: Record<string, any>) => {
    if (!questionnaire?.id) {
      toast({
        title: 'Error',
        description: 'No questionnaire loaded',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('dj_questionnaires')
        .update({ header_overrides: overrides })
        .eq('id', questionnaire.id);

      if (error) throw error;

      // Refetch to get updated data
      await fetchQuestionnaire();
    } catch (error) {
      console.error('Error updating header overrides:', error);
      toast({
        title: 'Error',
        description: 'Failed to update header details',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const debouncedUpdateSectionLabel = debounce(async (sectionId: string, label: string) => {
    try {
      const { error } = await supabase
        .from('dj_sections')
        .update({ label, updated_at: new Date().toISOString() })
        .eq('id', sectionId);
      
      if (error) throw error;
      
      toast({
        title: "Section renamed",
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Error updating section label:', error);
      toast({
        title: "Error",
        description: "Failed to rename section",
        variant: "destructive",
      });
    }
  }, 600);

  const updateSectionLabel = async (sectionId: string, label: string) => {
    if (!sectionId || !label) {
      console.error('Cannot update section label: missing required data');
      return;
    }
    debouncedUpdateSectionLabel(sectionId, label);
  };

  const addItemAbove = async (itemId: string, sectionId: string) => {
    if (!questionnaire || !itemId || !sectionId) {
      console.error('Cannot add item: missing required data');
      return;
    }
    
    try {
      const currentItem = questionnaire.sections
        ?.flatMap(s => s?.items || [])
        .find(item => item?.id === itemId);
      
      if (!currentItem?.type) {
        console.error('Current item not found or invalid');
        return;
      }

      await shiftItemsDown(sectionId, currentItem.sort_index);
      await createBlankRow(sectionId, currentItem.type, currentItem.sort_index);
      await fetchQuestionnaire();
      
      toast({
        title: "Row added",
        description: "New row inserted above",
      });
    } catch (error: any) {
      console.error('Error adding item above:', error);
      toast({
        title: "Error",
        description: "Failed to add row",
        variant: "destructive",
      });
    }
  };

  const addItemBelow = async (itemId: string, sectionId: string) => {
    if (!questionnaire || !itemId || !sectionId) {
      console.error('Cannot add item: missing required data');
      return;
    }
    
    try {
      const currentItem = questionnaire.sections
        ?.flatMap(s => s?.items || [])
        .find(item => item?.id === itemId);
      
      if (!currentItem?.type) {
        console.error('Current item not found or invalid');
        return;
      }

      await shiftItemsDown(sectionId, currentItem.sort_index + 1);
      await createBlankRow(sectionId, currentItem.type, currentItem.sort_index + 1);
      await fetchQuestionnaire();
      
      toast({
        title: "Row added",
        description: "New row inserted below",
      });
    } catch (error: any) {
      console.error('Error adding item below:', error);
      toast({
        title: "Error",
        description: "Failed to add row",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string, sectionId: string) => {
    if (!questionnaire || !itemId || !sectionId) {
      console.error('Cannot delete item: missing required data');
      return;
    }
    
    try {
      const section = questionnaire.sections?.find(s => s?.id === sectionId);
      const minRows = section?.items?.[0]?.meta?.minRows || 0;
      
      if (section && section.items && section.items.length <= minRows) {
        toast({
          title: "Cannot delete",
          description: `This section requires at least ${minRows} row(s)`,
          variant: "destructive",
        });
        return;
      }

      const { error: deleteError } = await supabase
        .from('dj_items')
        .delete()
        .eq('id', itemId);
      
      if (deleteError) throw deleteError;

      await supabase
        .from('dj_answers')
        .delete()
        .eq('item_id', itemId);
      
      await reindexSectionItems(sectionId);
      await fetchQuestionnaire();
      
      toast({
        title: "Row deleted",
      });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete row",
        variant: "destructive",
      });
    }
  };

  const reorderItems = async (activeId: string, overId: string, sectionId: string) => {
    if (!questionnaire || !activeId || !overId || !sectionId) {
      console.error('Cannot reorder items: missing required data');
      return;
    }
    
    try {
      const section = questionnaire.sections?.find(s => s?.id === sectionId);
      if (!section?.items) return;

      const items = [...section.items];
      const oldIndex = items.findIndex(item => item.id === activeId);
      const newIndex = items.findIndex(item => item.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const [removed] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, removed);

      for (let i = 0; i < items.length; i++) {
        await supabase
          .from('dj_items')
          .update({ sort_index: i })
          .eq('id', items[i].id);
      }

      await fetchQuestionnaire();
      
      toast({
        title: "Reordered",
        description: "Row order saved",
      });
    } catch (error: any) {
      console.error('Error reordering items:', error);
      toast({
        title: "Error",
        description: "Failed to reorder",
        variant: "destructive",
      });
    }
  };

  const bulkAddSongs = async (sectionId: string, songs: { song: string; artist: string; link: string; moment?: string }[]) => {
    try {
      const section = questionnaire?.sections.find(s => s.id === sectionId);
      if (!section) throw new Error('Section not found');

      const itemType = section.items[0]?.type || 'song_row';
      const maxSortIndex = await getMaxSortIndex(sectionId);

      const itemsToInsert = songs.map((song, index) => ({
        section_id: sectionId,
        type: itemType,
        prompt: section.items[0]?.prompt || 'Song',
        help_text: section.items[0]?.help_text || null,
        required: false,
        sort_index: maxSortIndex + 1 + index,
        meta: section.items[0]?.meta || {}
      }));

      const { data: newItems, error: insertError } = await supabase
        .from('dj_items')
        .insert(itemsToInsert)
        .select();

      if (insertError) throw insertError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const answersToInsert = newItems.map((item, index) => ({
        item_id: item.id,
        value: songs[index],
        answered_by: user.id
      }));

      const { error: answersError } = await supabase
        .from('dj_answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      await fetchQuestionnaire();

      toast({
        title: "Success",
        description: `${songs.length} songs imported successfully`,
      });
    } catch (error: any) {
      console.error('Error bulk adding songs:', error);
      toast({
        title: "Error",
        description: "Failed to import songs",
        variant: "destructive",
      });
      throw error;
    }
  };

  const applyRecommendations = async (sectionId: string, defaultRows: any[]) => {
    try {
      const section = questionnaire?.sections.find(s => s.id === sectionId);
      if (!section) throw new Error('Section not found');

      const itemType = section.items[0]?.type;
      const maxSortIndex = await getMaxSortIndex(sectionId);

      const itemsToInsert = defaultRows.map((_, index) => ({
        section_id: sectionId,
        type: itemType,
        prompt: section.items[0]?.prompt || 'Entry',
        help_text: section.items[0]?.help_text || null,
        required: false,
        sort_index: maxSortIndex + 1 + index,
        meta: section.items[0]?.meta || {}
      }));

      const { data: newItems, error: insertError } = await supabase
        .from('dj_items')
        .insert(itemsToInsert)
        .select();

      if (insertError) throw insertError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const answersToInsert = newItems.map((item, index) => ({
        item_id: item.id,
        value: defaultRows[index],
        answered_by: user.id
      }));

      const { error: answersError } = await supabase
        .from('dj_answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      await fetchQuestionnaire();

      toast({
        title: "Success",
        description: `${defaultRows.length} recommended ${defaultRows.length === 1 ? 'entry' : 'entries'} added`,
      });
    } catch (error: any) {
      console.error('Error applying recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to apply recommendations",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSectionVisibility = async (sectionVisibility: Record<string, boolean>) => {
    if (!questionnaire?.id) return;

    try {
      const { error } = await supabase
        .from('dj_questionnaires')
        .update({
          meta: {
            ...questionnaire.meta,
            sectionVisibility
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', questionnaire.id);

      if (error) throw error;

      // Update local state immediately
      setQuestionnaire(prev => prev ? {
        ...prev,
        meta: {
          ...prev.meta,
          sectionVisibility
        }
      } : null);

      toast({
        title: "Saved",
        description: "Section visibility updated",
      });
    } catch (error: any) {
      console.error('Error updating section visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update section visibility",
        variant: "destructive",
      });
    }
  };

  return {
    questionnaire,
    loading,
    hasUnsavedChanges,
    saveAnswer,
    updateStatus,
    createQuestionnaireFromTemplate,
    updateHeaderOverrides,
    updateSectionLabel,
    addItemAbove,
    addItemBelow,
    deleteItem,
    reorderItems,
    bulkAddSongs,
    applyRecommendations,
    updateSectionVisibility,
    refetch: fetchQuestionnaire,
  };
};
