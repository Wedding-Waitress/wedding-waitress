import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DJQuestionnaire, DJQuestionnaireWithData, DJSection, DJItem, DJAnswer, TemplateType, ItemType, QuestionnaireStatus } from '@/types/djQuestionnaire';
import { DJ_TEMPLATES } from '@/lib/djQuestionnaireTemplates';

export type { TemplateType } from '@/types/djQuestionnaire';

export const useDJQuestionnaire = (eventId: string | null) => {
  const [questionnaire, setQuestionnaire] = useState<DJQuestionnaireWithData | null>(null);
  const [loading, setLoading] = useState(false);
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
          status: 'draft'
        })
        .select()
        .single();

      if (qError) throw qError;

      // Get template
      const template = DJ_TEMPLATES[templateType];

      // Create sections and items
      for (const sectionTemplate of template) {
        const { data: newSection, error: sError } = await supabase
          .from('dj_sections')
          .insert({
            questionnaire_id: newQ.id,
            label: sectionTemplate.label,
            instructions: sectionTemplate.instructions,
            sort_index: sectionTemplate.sort_index
          })
          .select()
          .single();

        if (sError) throw sError;

        // Create items for this section
        const itemsToInsert = sectionTemplate.items.map(item => ({
          section_id: newSection.id,
          type: item.type,
          prompt: item.prompt,
          help_text: item.help_text || null,
          required: item.required,
          sort_index: item.sort_index,
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

  const saveAnswer = async (itemId: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('dj_answers')
        .upsert({
          item_id: itemId,
          value: value,
          answered_by: user.id
        }, {
          onConflict: 'item_id'
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving answer:', error);
      toast({
        title: "Error",
        description: "Failed to save answer",
        variant: "destructive",
      });
    }
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

  return {
    questionnaire,
    loading,
    saveAnswer,
    updateStatus,
    createQuestionnaireFromTemplate,
    refetch: fetchQuestionnaire,
  };
};
