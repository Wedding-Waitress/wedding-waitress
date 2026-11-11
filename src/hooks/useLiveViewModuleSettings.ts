import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { retiredLiveViewAsset } from '@/lib/liveViewAssetCleanup';
import { syncEventHeroImage } from '@/lib/eventHeroImage';
import { useOptimisticEventSettings } from './useOptimisticEventSettings';
import { useEffect, useRef, useState } from 'react';
import { getCacheGeneration } from '@/lib/cacheRegistry';

export interface LiveViewModuleSettings {
  id?: string;
  event_id: string;
  rsvp_invite_config: Record<string, any>;
  update_details_config: Record<string, any>;
  search_config: Record<string, any>;
  ceremony_config: Record<string, any>;
  reception_config: Record<string, any>;
  invite_video_config: Record<string, any>;
  welcome_video_config: Record<string, any>;
  floor_plan_config: Record<string, any>;
  menu_config: Record<string, any>;
  hero_image_config: Record<string, any>;
  reception_floor_plan_config: Record<string, any>;
  updated_at?: string;
}

const configKeys = ['rsvp_invite_config', 'update_details_config', 'search_config', 'ceremony_config',
  'reception_config', 'invite_video_config', 'welcome_video_config', 'floor_plan_config', 'menu_config',
  'hero_image_config', 'reception_floor_plan_config'] as const;
const normalize = (data: any): LiveViewModuleSettings => ({
  ...data, ...Object.fromEntries(configKeys.map(key => [key, data[key] || {}])),
});
export const useLiveViewModuleSettings = (eventId: string | undefined) => {
  const { toast } = useToast();
  const syncAttempt = useRef<string | null>(null);
  const [syncFailure, setSyncFailure] = useState<string | null>(null);
  const [syncRevision, setSyncRevision] = useState(0);
  const state = useOptimisticEventSettings<LiveViewModuleSettings>({
    namespace: 'live-view-module-settings', eventId,
    read: async id => {
      const { data, error } = await supabase.from('live_view_module_settings').select('*').eq('event_id', id).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) return normalize(data);
      const defaults = { event_id: id, ...Object.fromEntries(configKeys.map(key => [key, {}])) };
      const created = await supabase.from('live_view_module_settings').upsert(defaults, { onConflict: 'event_id', ignoreDuplicates: true }).select().maybeSingle();
      if (created.error) throw created.error;
      if (created.data) return normalize(created.data);
      const existing = await supabase.from('live_view_module_settings').select('*').eq('event_id', id).single();
      if (existing.error) throw existing.error;
      return normalize(existing.data);
    },
    write: async (id, updates, confirmed) => {
      const { data, error } = await supabase.from('live_view_module_settings').update(updates).eq('event_id', id).select().single();
      if (error) throw error;
      for (const module of configKeys) {
        const config = updates[module];
        if (!config) continue;
        const retired = retiredLiveViewAsset(
          confirmed[module]?.file_url || confirmed[module]?.video_url, config.file_url || config.video_url,
          Object.entries(data).filter(([key]) => key !== module).map(([, value]) => typeof value === 'object' && value ? (value as any).file_url : undefined),
          id, import.meta.env.VITE_SUPABASE_URL,
        );
        if (retired) {
          // Cleanup failure must not roll back a settings write that succeeded.
          try {
            const cleanup = await supabase.storage.from(retired.bucket).remove([retired.path]);
            if (cleanup.error) throw cleanup.error;
          } catch { toast({ title: 'Settings saved; file cleanup failed', description: 'The previous upload could not be removed.', variant: 'destructive' }); }
        }
      }
      return normalize(data);
    },
    onError: () => toast({ title: 'Error saving settings', description: 'The last saved module configuration has been restored. Please try again.', variant: 'destructive' }),
  });
  useEffect(() => {
    if (!eventId || !state.settings || syncAttempt.current === eventId) return;
    const id = eventId;
    const generation = getCacheGeneration();
    let active = true;
    syncAttempt.current = id;
    setSyncFailure(null);
    // Saved settings are visible before image sync. Its server compare-and-set
    // prevents background image publishing from overwriting concurrent edits.
    void syncEventHeroImage(id).then(changed => {
      if (active && generation === getCacheGeneration() && changed) void state.refresh();
    }).catch(() => {
      if (active && generation === getCacheGeneration()) setSyncFailure(id);
    });
    return () => { active = false; };
  }, [eventId, !!state.settings, syncRevision]);
  const retrySettings = () => {
    syncAttempt.current = null;
    setSyncFailure(null);
    setSyncRevision(value => value + 1);
    void state.refresh();
  };
  return {
    settings: state.settings ?? null, loading: state.isLoading, saving: state.isSaving, error: state.isError,
    photoSyncError: !!eventId && syncFailure === eventId, retrySettings,
    updateModuleConfig: (module: keyof Omit<LiveViewModuleSettings, 'id' | 'event_id' | 'updated_at'>, config: Record<string, any>) => state.update({ [module]: config }),
    refreshSettings: state.refresh,
  };
};
