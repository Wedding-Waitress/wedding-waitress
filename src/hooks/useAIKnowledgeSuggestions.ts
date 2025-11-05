import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FAQSuggestion {
  question: string;
  answer: string;
  category: 'venue' | 'timing' | 'attire' | 'food' | 'policies' | 'logistics' | 'other';
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  selected?: boolean;
}

export interface SuggestionContext {
  name: string;
  guest_count: number;
  days_until_event: number;
  existing_faq_count: number;
}

export const useAIKnowledgeSuggestions = (eventId: string | null) => {
  const [suggestions, setSuggestions] = useState<FAQSuggestion[]>([]);
  const [context, setContext] = useState<SuggestionContext | null>(null);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateSuggestions = async () => {
    if (!eventId) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-knowledge-suggestions', {
        body: { event_id: eventId }
      });

      if (error) throw error;

      // Mark all suggestions as selected by default
      const suggestionsWithSelection = data.suggestions.map((s: FAQSuggestion) => ({
        ...s,
        selected: true
      }));

      setSuggestions(suggestionsWithSelection);
      setContext(data.event_context);

      toast({
        title: '✨ Suggestions Generated',
        description: `Found ${data.suggestions.length} relevant FAQs for your event`,
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate FAQ suggestions',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    setSuggestions(prev => prev.map((s, i) => 
      i === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, selected: true })));
  };

  const deselectAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, selected: false })));
  };

  const getSelectedCount = () => {
    return suggestions.filter(s => s.selected).length;
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setContext(null);
  };

  return {
    suggestions,
    context,
    generating,
    generateSuggestions,
    toggleSuggestion,
    selectAll,
    deselectAll,
    getSelectedCount,
    clearSuggestions
  };
};
