import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJMCQuestionnaire, DJMCSection, DJMCItem, DJMCShareToken, SectionType } from '@/types/djMCQuestionnaire';
import { DEFAULT_SECTION_TEMPLATES, SECTION_ORDER } from '@/lib/djMCQuestionnaireTemplates';
import debounce from 'lodash-es/debounce';

export function useDJMCQuestionnaire(eventId: string | null) {
  const [questionnaire, setQuestionnaire] = useState<DJMCQuestionnaire | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareTokens, setShareTokens] = useState<DJMCShareToken[]>([]);
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch or create questionnaire for event
  const fetchQuestionnaire = useCallback(async () => {
    if (!eventId) {
      setQuestionnaire(null);
      return;
    }

    setLoading(true);
    try {
      // First, try to get existing questionnaire
      const { data: existingQ, error: fetchError } = await supabase
        .from('dj_mc_questionnaires')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let questionnaireId: string;

      if (existingQ) {
        questionnaireId = existingQ.id;
      } else {
        // Create new questionnaire
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: newQ, error: createError } = await supabase
          .from('dj_mc_questionnaires')
          .insert({ event_id: eventId, user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        questionnaireId = newQ.id;

        // Create default sections and items
        await createDefaultSections(questionnaireId);
      }

      // Fetch full questionnaire with sections and items
      const fullQuestionnaire = await fetchFullQuestionnaire(questionnaireId);
      setQuestionnaire(fullQuestionnaire);

      // Fetch share tokens
      await fetchShareTokens(questionnaireId);
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

  // Create default sections from templates
  const createDefaultSections = async (questionnaireId: string) => {
    for (let sectionIndex = 0; sectionIndex < DEFAULT_SECTION_TEMPLATES.length; sectionIndex++) {
      const template = DEFAULT_SECTION_TEMPLATES[sectionIndex];
      
      // Insert section
      const { data: section, error: sectionError } = await supabase
        .from('dj_mc_sections')
        .insert({
          questionnaire_id: questionnaireId,
          section_type: template.section_type,
          section_label: template.section_label,
          order_index: sectionIndex,
          is_collapsed: false,
        })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // Insert items for this section
      const itemsToInsert = template.items.map((item, itemIndex) => ({
        section_id: section.id,
        row_label: item.row_label,
        value_text: null,
        music_url: null,
        pronunciation_audio_url: null,
        duration: null,
        order_index: itemIndex,
        is_default: true,
      }));

      const { error: itemsError } = await supabase
        .from('dj_mc_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }
  };

  // Fetch full questionnaire with all relations
  const fetchFullQuestionnaire = async (questionnaireId: string): Promise<DJMCQuestionnaire> => {
    const { data: q, error: qError } = await supabase
      .from('dj_mc_questionnaires')
      .select('*')
      .eq('id', questionnaireId)
      .single();

    if (qError) throw qError;

    const { data: sections, error: sectionsError } = await supabase
      .from('dj_mc_sections')
      .select('*')
      .eq('questionnaire_id', questionnaireId)
      .order('order_index');

    if (sectionsError) throw sectionsError;

    const sectionsWithItems: DJMCSection[] = await Promise.all(
      sections.map(async (section) => {
        const { data: items, error: itemsError } = await supabase
          .from('dj_mc_items')
          .select('*')
          .eq('section_id', section.id)
          .order('order_index');

        if (itemsError) throw itemsError;

        return {
          ...section,
          section_type: section.section_type as SectionType,
          items: items || [],
        } as DJMCSection;
      })
    );

    return {
      ...q,
      sections: sectionsWithItems,
    } as DJMCQuestionnaire;
  };

  // Fetch share tokens
  const fetchShareTokens = async (questionnaireId: string) => {
    const { data, error } = await supabase
      .from('dj_mc_share_tokens')
      .select('*')
      .eq('questionnaire_id', questionnaireId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShareTokens(data as DJMCShareToken[]);
    }
  };

  // Debounced save for auto-save
  const debouncedSave = useRef(
    debounce(async (sectionId: string, updates: Partial<DJMCSection>) => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('dj_mc_sections')
          .update(updates)
          .eq('id', sectionId);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving section:', error);
      } finally {
        setSaving(false);
      }
    }, 600)
  ).current;

  // Update section
  const updateSection = useCallback(async (sectionId: string, updates: Partial<DJMCSection>) => {
    // Optimistic update
    setQuestionnaire(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, ...updates } : s
        ),
      };
    });

    // Debounced save
    debouncedSave(sectionId, updates);
  }, [debouncedSave]);

  // Update item
  const updateItem = useCallback(async (itemId: string, updates: Partial<DJMCItem>) => {
    // Optimistic update
    setQuestionnaire(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s => ({
          ...s,
          items: s.items.map(i =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        })),
      };
    });

    // Save to database
    setSaving(true);
    try {
      const { error } = await supabase
        .from('dj_mc_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  // Add new item to section
  const addItem = useCallback(async (sectionId: string, rowLabel: string = 'New Item') => {
    if (!questionnaire) return;

    const section = questionnaire.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newOrderIndex = section.items.length;

    try {
      const { data: newItem, error } = await supabase
        .from('dj_mc_items')
        .insert({
          section_id: sectionId,
          row_label: rowLabel,
          order_index: newOrderIndex,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId
              ? { ...s, items: [...s.items, newItem as DJMCItem] }
              : s
          ),
        };
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add row',
        variant: 'destructive',
      });
    }
  }, [questionnaire, toast]);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('dj_mc_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s => ({
            ...s,
            items: s.items.filter(i => i.id !== itemId),
          })),
        };
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete row',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Duplicate item
  const duplicateItem = useCallback(async (item: DJMCItem) => {
    try {
      const { data: newItem, error } = await supabase
        .from('dj_mc_items')
        .insert({
          section_id: item.section_id,
          row_label: item.row_label,
          value_text: item.value_text,
          music_url: item.music_url,
          pronunciation_audio_url: item.pronunciation_audio_url,
          duration: item.duration,
          order_index: item.order_index + 1,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === item.section_id
              ? {
                  ...s,
                  items: [...s.items.slice(0, s.items.findIndex(i => i.id === item.id) + 1),
                    newItem as DJMCItem,
                    ...s.items.slice(s.items.findIndex(i => i.id === item.id) + 1)
                  ],
                }
              : s
          ),
        };
      });
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate row',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Reorder items within section
  const reorderItems = useCallback(async (sectionId: string, items: DJMCItem[]) => {
    // Optimistic update
    setQuestionnaire(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, items } : s
        ),
      };
    });

    // Update order in database
    try {
      const updates = items.map((item, index) => 
        supabase
          .from('dj_mc_items')
          .update({ order_index: index })
          .eq('id', item.id)
      );
      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  }, []);

  // Reset section to default template
  const resetSectionToDefault = useCallback(async (sectionId: string) => {
    if (!questionnaire) return;

    const section = questionnaire.sections.find(s => s.id === sectionId);
    if (!section) return;

    const template = DEFAULT_SECTION_TEMPLATES.find(t => t.section_type === section.section_type);
    if (!template) return;

    try {
      // Delete existing items
      await supabase
        .from('dj_mc_items')
        .delete()
        .eq('section_id', sectionId);

      // Insert default items
      const itemsToInsert = template.items.map((item, index) => ({
        section_id: sectionId,
        row_label: item.row_label,
        order_index: index,
        is_default: true,
      }));

      const { data: newItems, error } = await supabase
        .from('dj_mc_items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;

      // Reset section label
      await supabase
        .from('dj_mc_sections')
        .update({ section_label: template.section_label })
        .eq('id', sectionId);

      // Update local state
      setQuestionnaire(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId
              ? { ...s, section_label: template.section_label, items: newItems as DJMCItem[] }
              : s
          ),
        };
      });

      toast({
        title: 'Reset Complete',
        description: 'Section has been reset to defaults',
      });
    } catch (error) {
      console.error('Error resetting section:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset section',
        variant: 'destructive',
      });
    }
  }, [questionnaire, toast]);

  // Generate share token
  const generateShareToken = useCallback(async (
    permission: 'view_only' | 'can_edit',
    recipientName?: string,
    validityDays: number = 90
  ): Promise<string | null> => {
    if (!questionnaire) return null;

    try {
      const { data, error } = await supabase.rpc('generate_dj_mc_share_token', {
        _questionnaire_id: questionnaire.id,
        _permission: permission,
        _recipient_name: recipientName || null,
        _validity_days: validityDays,
      });

      if (error) throw error;

      // Refresh share tokens
      await fetchShareTokens(questionnaire.id);

      return data as string;
    } catch (error) {
      console.error('Error generating share token:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate share link',
        variant: 'destructive',
      });
      return null;
    }
  }, [questionnaire, toast]);

  // Delete share token
  const deleteShareToken = useCallback(async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('dj_mc_share_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      setShareTokens(prev => prev.filter(t => t.id !== tokenId));

      toast({
        title: 'Access Revoked',
        description: 'Share link has been deleted',
      });
    } catch (error) {
      console.error('Error deleting share token:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke access',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Calculate progress
  const calculateProgress = useCallback(() => {
    if (!questionnaire) return 0;

    let totalItems = 0;
    let filledItems = 0;

    questionnaire.sections.forEach(section => {
      section.items.forEach(item => {
        totalItems++;
        if (item.value_text || item.music_url) {
          filledItems++;
        }
      });
    });

    return totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0;
  }, [questionnaire]);

  // Initial fetch
  useEffect(() => {
    fetchQuestionnaire();
  }, [fetchQuestionnaire]);

  return {
    questionnaire,
    loading,
    saving,
    shareTokens,
    updateSection,
    updateItem,
    addItem,
    deleteItem,
    duplicateItem,
    reorderItems,
    resetSectionToDefault,
    generateShareToken,
    deleteShareToken,
    calculateProgress,
    refetch: fetchQuestionnaire,
  };
}
