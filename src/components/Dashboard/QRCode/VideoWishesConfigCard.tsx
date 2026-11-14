import React from 'react';
import { Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticEventSettings } from '@/hooks/useOptimisticEventSettings';
import { ModuleVisibilityControl } from './ModuleVisibilityControl';
interface VideoWishesSettings { event_id: string; enabled: boolean }
export function VideoWishesConfigCard({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const state = useOptimisticEventSettings<VideoWishesSettings>({
    namespace: 'video-wishes-settings', eventId,
    read: async id => {
      const { data, error } = await (supabase as any).from('video_wishes_settings').select('event_id,enabled').eq('event_id', id).maybeSingle();
      if (error) throw error;
      return data ?? { event_id: id, enabled: false };
    },
    write: async (id, updates) => {
      if (updates.enabled) {
        const { error } = await (supabase as any).rpc('ensure_event_media_gallery', { _event_id: id });
        if (error) throw error;
      }
      const { data, error } = await (supabase as any).from('video_wishes_settings').upsert({ event_id: id, ...updates }).select('event_id,enabled').single();
      if (error) throw error;
      return data;
    },
    onError: () => toast({ title: 'Could not update Video Wishes', description: 'The last saved setting has been restored. Please try again.', variant: 'destructive' }),
  });
  return <div className="space-y-3 p-4 rounded-lg border border-[#472c1d] bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
    <div className="flex flex-wrap items-center justify-between gap-3 max-lg:flex-col max-lg:items-stretch">
      <div className="flex items-center gap-3"><Video className="h-5 w-5 text-[#856A4C]" strokeWidth={1.8} />
        <div><h4 className="text-sm font-semibold">Video Wishes</h4><p className="text-xs text-muted-foreground">Let guests send private video messages of up to two minutes</p></div>
      </div>
      <ModuleVisibilityControl label="Video Wishes" enabled={state.settings?.enabled} failed={state.isError} onRetry={() => { void state.refresh(); }} onChange={enabled => { void state.update({ enabled }); }} />
    </div>
  </div>;
}
