import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AISeatingsuggestion {
  id: string;
  event_id: string;
  guest_id: string;
  suggested_table_id: string;
  confidence_score: number | null;
  reasoning: string | null;
  status: string | null;
  created_at: string;
  guest?: {
    first_name: string;
    last_name: string;
    table_id: string | null;
  };
  suggested_table?: {
    name: string;
    table_no: number;
  };
}

export const useAISeatingsuggestions = (eventId: string | null) => {
  const [suggestions, setSuggestions] = useState<AISeatingsuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSuggestions = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_seating_suggestions')
        .select(`
          *,
          guest:guests(first_name, last_name, table_id),
          suggested_table:tables!ai_seating_suggestions_suggested_table_id_fkey(name, table_no)
        `)
        .eq('event_id', eventId)
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-seating-suggestions', {
        body: { event_id: eventId }
      });

      if (error) throw error;

      toast({
        title: 'AI Suggestions Generated',
        description: `Created ${data.suggestions_count} seating suggestions`
      });
      
      await fetchSuggestions();
      return data;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI suggestions',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const acceptSuggestion = async (suggestionId: string) => {
    try {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      // Update guest table assignment
      const { error: guestError } = await supabase
        .from('guests')
        .update({ table_id: suggestion.suggested_table_id })
        .eq('id', suggestion.guest_id);

      if (guestError) throw guestError;

      // Mark suggestion as accepted
      const { error: suggestionError } = await supabase
        .from('ai_seating_suggestions')
        .update({ status: 'accepted' })
        .eq('id', suggestionId);

      if (suggestionError) throw suggestionError;

      toast({
        title: 'Suggestion Accepted',
        description: 'Guest assigned to suggested table'
      });
      
      await fetchSuggestions();
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept suggestion',
        variant: 'destructive'
      });
    }
  };

  const rejectSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_seating_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;

      toast({
        title: 'Suggestion Rejected',
        description: 'Suggestion dismissed'
      });
      
      await fetchSuggestions();
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject suggestion',
        variant: 'destructive'
      });
    }
  };

  const acceptBatch = async (suggestionIds: string[]) => {
    try {
      for (const id of suggestionIds) {
        await acceptSuggestion(id);
      }
      
      toast({
        title: 'Batch Accepted',
        description: `${suggestionIds.length} suggestions applied`
      });
    } catch (error) {
      console.error('Failed to accept batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept all suggestions',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchSuggestions();
    
    // Subscribe to real-time updates
    if (!eventId) return;
    
    const channel = supabase
      .channel(`ai-suggestions:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_seating_suggestions',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return {
    suggestions,
    loading,
    fetchSuggestions,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    acceptBatch
  };
};
