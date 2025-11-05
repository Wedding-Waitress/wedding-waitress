import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KnowledgeBaseEntry {
  id: string;
  event_id: string;
  category: 'faq' | 'venue' | 'vendors' | 'timeline' | 'policies' | 'other';
  question?: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useKnowledgeBase = (eventId: string | null) => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchKnowledgeBase = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('event_id', eventId)
        .order('category, sort_order');

      if (error) throw error;
      setKnowledgeBase((data || []) as KnowledgeBaseEntry[]);
    } catch (error) {
      console.error('Failed to fetch knowledge base:', error);
      toast({
        title: 'Error',
        description: 'Failed to load knowledge base',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (entry: Partial<KnowledgeBaseEntry>) => {
    if (!eventId) return;

    try {
      if (entry.id) {
        // Update existing
        const { error } = await supabase
          .from('ai_knowledge_base')
          .update({
            question: entry.question,
            answer: entry.answer,
            sort_order: entry.sort_order,
            is_active: entry.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('ai_knowledge_base')
          .insert({
            event_id: eventId,
            category: entry.category!,
            question: entry.question,
            answer: entry.answer!,
            sort_order: entry.sort_order || 0,
            is_active: entry.is_active !== false
          });

        if (error) throw error;
      }

      await fetchKnowledgeBase();
      return true;
    } catch (error) {
      console.error('Failed to save entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save entry',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchKnowledgeBase();
      toast({
        title: 'Deleted',
        description: 'Entry removed successfully'
      });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete entry',
        variant: 'destructive'
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await fetchKnowledgeBase();
    } catch (error) {
      console.error('Failed to toggle entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update entry',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
  }, [eventId]);

  return {
    knowledgeBase,
    loading,
    saveEntry,
    deleteEntry,
    toggleActive,
    refetch: fetchKnowledgeBase
  };
};
