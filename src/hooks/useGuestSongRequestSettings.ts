import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GuestSongRequestSettings {
  id: string;
  event_id: string;
  enabled: boolean;
  max_requests_per_guest: number;
}

export const useGuestSongRequestSettings = (eventId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['guest-song-request-settings', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await (supabase as any)
        .from('guest_song_request_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: created, error: insErr } = await (supabase as any)
          .from('guest_song_request_settings')
          .insert({ event_id: eventId, enabled: false, max_requests_per_guest: 2 })
          .select()
          .single();
        if (insErr) throw insErr;
        return created as GuestSongRequestSettings;
      }
      return data as GuestSongRequestSettings;
    },
    enabled: !!eventId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<GuestSongRequestSettings>) => {
      if (!eventId) throw new Error('No event');
      const { error } = await (supabase as any)
        .from('guest_song_request_settings')
        .update(updates)
        .eq('event_id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-song-request-settings', eventId] });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message ?? 'Failed to save', variant: 'destructive' });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: (updates: Partial<GuestSongRequestSettings>) => updateMutation.mutate(updates),
  };
};
