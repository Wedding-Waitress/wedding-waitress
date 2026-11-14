import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticEventSettings } from './useOptimisticEventSettings';

export interface LiveViewVisibility {
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
  show_reception_floor_plan: boolean;
  kiosk_show_rsvp_status: boolean;
  kiosk_show_dietary: boolean;
  updated_at: string;
}
export const useLiveViewVisibility = (eventId: string | null) => {
  const { toast } = useToast();
  const state = useOptimisticEventSettings<LiveViewVisibility>({
    namespace: 'live-view-visibility', eventId,
    read: async id => {
      const { data, error } = await supabase.from('live_view_settings').select('*').eq('event_id', id).maybeSingle();
      if (error) throw error;
      if (data) return data as LiveViewVisibility;
      const result = await supabase.from('live_view_settings').upsert({
        event_id: id, show_rsvp_invite: false, show_update_details: false, show_search: true,
        show_ceremony: false, show_reception: false, show_invite_video: false, show_welcome_video: false,
        show_floor_plan: false, show_menu: false, show_reception_floor_plan: false,
        kiosk_show_rsvp_status: true, kiosk_show_dietary: true,
      }, { onConflict: 'event_id', ignoreDuplicates: true }).select().maybeSingle();
      if (result.error) throw result.error;
      if (result.data) return result.data as LiveViewVisibility;
      const existing = await supabase.from('live_view_settings').select('*').eq('event_id', id).single();
      if (existing.error) throw existing.error;
      return existing.data as LiveViewVisibility;
    },
    write: async (id, updates) => {
      const { data, error } = await supabase.from('live_view_settings').update(updates).eq('event_id', id).select().single();
      if (error) throw error;
      return data as LiveViewVisibility;
    },
    onError: () => toast({ title: 'Visibility could not be saved', description: 'The last saved settings have been restored. Please try again.', variant: 'destructive' }),
  });
  return { ...state, updateVisibility: (key: keyof LiveViewVisibility, value: boolean) => { void state.update({ [key]: value }); } };
};
