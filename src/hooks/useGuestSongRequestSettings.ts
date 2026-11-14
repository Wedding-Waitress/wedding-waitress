import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticEventSettings } from './useOptimisticEventSettings';
export interface GuestSongRequestSettings {
  id: string;
  event_id: string;
  enabled: boolean;
  max_requests_per_guest: number;
}
export const useGuestSongRequestSettings = (eventId: string | null) => {
  const { toast } = useToast();
  const state = useOptimisticEventSettings<GuestSongRequestSettings>({
    namespace: 'guest-song-request-settings', eventId,
    read: async id => {
      const { data, error } = await (supabase as any).from('guest_song_request_settings').select('*').eq('event_id', id).maybeSingle();
      if (error) throw error;
      if (data) return data;
      const created = await (supabase as any).from('guest_song_request_settings').upsert({ event_id: id, enabled: false, max_requests_per_guest: 2 }, { onConflict: 'event_id', ignoreDuplicates: true }).select().maybeSingle();
      if (created.error) throw created.error;
      if (created.data) return created.data;
      const existing = await (supabase as any).from('guest_song_request_settings').select('*').eq('event_id', id).single();
      if (existing.error) throw existing.error;
      return existing.data;
    },
    write: async (id, updates) => {
      const { data, error } = await (supabase as any).from('guest_song_request_settings').update(updates).eq('event_id', id).select().single();
      if (error) throw error;
      return data;
    },
    onError: () => toast({ title: 'Song request settings could not be saved', description: 'The last saved settings have been restored. Please try again.', variant: 'destructive' }),
  });
  return { ...state, updateSettings: (updates: Partial<GuestSongRequestSettings>) => { void state.update(updates); } };
};
