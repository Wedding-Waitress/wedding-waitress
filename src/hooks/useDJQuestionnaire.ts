import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TemplateType = 'wedding_mr_mrs' | 'wedding_mr_mr' | 'wedding_mrs_mrs' | 'events';

export interface QuestionnaireResponse {
  id: string;
  event_id: string;
  user_id: string;
  template_type: TemplateType;
  responses: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useDJQuestionnaire = (eventId: string | null) => {
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchQuestionnaire = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dj_questionnaire_responses')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      setQuestionnaire(data as QuestionnaireResponse);
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

  const saveQuestionnaire = async (
    templateType: TemplateType,
    responses: Record<string, any>
  ) => {
    if (!eventId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const payload = {
        event_id: eventId,
        user_id: user.id,
        template_type: templateType,
        responses,
      };

      if (questionnaire) {
        // Update existing
        const { error } = await supabase
          .from('dj_questionnaire_responses')
          .update(payload)
          .eq('id', questionnaire.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('dj_questionnaire_responses')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setQuestionnaire(data as QuestionnaireResponse);
      }

      await fetchQuestionnaire();
    } catch (error: any) {
      console.error('Error saving questionnaire:', error);
      toast({
        title: "Error",
        description: "Failed to save questionnaire",
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
    saveQuestionnaire,
    refetch: fetchQuestionnaire,
  };
};
