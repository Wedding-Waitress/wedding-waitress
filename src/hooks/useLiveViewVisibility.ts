import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveViewVisibility {
  id: string;
  event_id: string;
  show_rsvp_invite: boolean;
  show_update_details: boolean;
  show_search: boolean;
  show_ceremony: boolean;
  show_reception: boolean;
  show_invite_video: boolean;
  show_welcome_video: boolean;
  show_floor_plan: boolean;
  show_menu: boolean;
  updated_at: string;
}

export const useLiveViewVisibility = (eventId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch live view visibility settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['live-view-visibility', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from('live_view_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching live view visibility:', error);
        throw error;
      }

      // If no settings exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('live_view_settings')
          .insert({
            event_id: eventId,
            show_rsvp_invite: false,
            show_update_details: false,
            show_search: true,
            show_ceremony: false,
            show_reception: false,
            show_invite_video: false,
            show_welcome_video: false,
            show_floor_plan: false,
            show_menu: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating live view visibility:', insertError);
          throw insertError;
        }

        return newData as LiveViewVisibility;
      }

      return data as LiveViewVisibility;
    },
    enabled: !!eventId,
  });

  // Update live view visibility
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<LiveViewVisibility>) => {
      if (!eventId) throw new Error('No event ID provided');

      const { data, error } = await supabase
        .from('live_view_settings')
        .update(updates)
        .eq('event_id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-view-visibility', eventId] });
    },
    onError: (error) => {
      console.error('Error updating live view visibility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update visibility settings',
        variant: 'destructive',
      });
    },
  });

  const updateVisibility = (key: keyof LiveViewVisibility, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  return {
    settings,
    isLoading,
    updateVisibility,
  };
};
