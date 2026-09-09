import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { retiredLiveViewAsset } from '@/lib/liveViewAssetCleanup';
import { syncEventHeroImage } from '@/lib/eventHeroImage';

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

export const useLiveViewModuleSettings = (eventId: string | undefined) => {
  const [settings, setSettings] = useState<LiveViewModuleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const generation = useRef(0);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);

  // Fetch settings on mount
  useEffect(() => {
    const current = ++generation.current;
    setSettings(null);
    setLoading(!!eventId);
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        try { await syncEventHeroImage(eventId); }
        catch { toast({ title: 'Event photo could not be synced', description: 'Your existing guest-app image has been kept. Reload to retry.', variant: 'destructive' }); }
        const { data, error } = await supabase
          .from('live_view_module_settings')
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (generation.current !== current) return;
        if (data) {
          setSettings({
            ...data,
            rsvp_invite_config: data.rsvp_invite_config as Record<string, any>,
            update_details_config: data.update_details_config as Record<string, any>,
            search_config: data.search_config as Record<string, any>,
            ceremony_config: data.ceremony_config as Record<string, any>,
            reception_config: data.reception_config as Record<string, any>,
            invite_video_config: data.invite_video_config as Record<string, any>,
            welcome_video_config: data.welcome_video_config as Record<string, any>,
            floor_plan_config: data.floor_plan_config as Record<string, any> || {},
            menu_config: data.menu_config as Record<string, any> || {},
            hero_image_config: (data as any).hero_image_config as Record<string, any> || {},
            reception_floor_plan_config: (data as any).reception_floor_plan_config as Record<string, any> || {},
          });
        } else {
          // Upsert default settings if none exist
          const defaultSettings = {
            event_id: eventId,
            rsvp_invite_config: {},
            update_details_config: {},
            search_config: {},
            ceremony_config: {},
            reception_config: {},
            invite_video_config: {},
            welcome_video_config: {},
            floor_plan_config: {},
            menu_config: {},
            hero_image_config: {},
            reception_floor_plan_config: {}
          };

          const { data: newData, error: upsertError } = await supabase
            .from('live_view_module_settings')
            .upsert(defaultSettings)
            .select()
            .single();

          if (upsertError) throw upsertError;
          if (generation.current !== current) return;
          setSettings({
            ...newData,
            rsvp_invite_config: newData.rsvp_invite_config as Record<string, any>,
            update_details_config: newData.update_details_config as Record<string, any>,
            search_config: newData.search_config as Record<string, any>,
            ceremony_config: newData.ceremony_config as Record<string, any>,
            reception_config: newData.reception_config as Record<string, any>,
            invite_video_config: newData.invite_video_config as Record<string, any>,
            welcome_video_config: newData.welcome_video_config as Record<string, any>,
            floor_plan_config: newData.floor_plan_config as Record<string, any> || {},
            menu_config: newData.menu_config as Record<string, any> || {},
            hero_image_config: (newData as any).hero_image_config as Record<string, any> || {},
            reception_floor_plan_config: (newData as any).reception_floor_plan_config as Record<string, any> || {},
          });
        }
      } catch (error) {
        if (generation.current !== current) return;
        console.error('Error fetching module settings:', error);
        toast({
          title: 'Error loading module settings',
          description: 'Could not load module configuration.',
          variant: 'destructive'
        });
      } finally {
        if (generation.current === current) setLoading(false);
      }
    };

    fetchSettings();
    return () => { generation.current++; };
  }, [eventId, toast, revision]);

  // Update a specific module's config
  const updateModuleConfig = async (
    module: keyof Omit<LiveViewModuleSettings, 'id' | 'event_id' | 'updated_at'>,
    config: Record<string, any>
  ) => {
    if (!eventId || !settings || settings.event_id !== eventId || loading || saving) return false;
    const current = generation.current;
    setSaving(true);

    try {
      // Optimistic update
      setSettings(prev => prev ? { ...prev, [module]: config } : null);

      const { error } = await supabase
        .from('live_view_module_settings')
        .update({ [module]: config })
        .eq('event_id', eventId).select('id').single();

      if (error) throw error;

      const retired = retiredLiveViewAsset(
        settings[module]?.file_url || settings[module]?.video_url, config.file_url || config.video_url,
        Object.entries(settings).filter(([key]) => key !== module).map(([, value]) => typeof value === 'object' && value ? value.file_url : undefined),
        eventId, import.meta.env.VITE_SUPABASE_URL,
      );
      if (retired) {
        const { error: cleanupError } = await supabase.storage.from(retired.bucket).remove([retired.path]);
        if (cleanupError) toast({ title: 'Settings saved; file cleanup failed', description: 'The previous upload could not be removed.', variant: 'destructive' });
      }
      toast({
        title: 'Settings saved',
        description: 'Module configuration updated successfully.'
      });
      return true;
    } catch (error) {
      console.error('Error updating module config:', error);
      toast({
        title: 'Error saving settings',
        description: 'Could not update module configuration.',
        variant: 'destructive'
      });
      
      // Restore the last saved state even if the recovery request also fails.
      if (generation.current === current) setSettings(settings);
      const { data } = await supabase
        .from('live_view_module_settings')
        .select('*')
        .eq('event_id', eventId)
        .single();
      
      if (data && generation.current === current) {
        setSettings({
          ...data,
          rsvp_invite_config: data.rsvp_invite_config as Record<string, any>,
          update_details_config: data.update_details_config as Record<string, any>,
          search_config: data.search_config as Record<string, any>,
          ceremony_config: data.ceremony_config as Record<string, any>,
          reception_config: data.reception_config as Record<string, any>,
          invite_video_config: data.invite_video_config as Record<string, any>,
          welcome_video_config: data.welcome_video_config as Record<string, any>,
          floor_plan_config: data.floor_plan_config as Record<string, any> || {},
          menu_config: data.menu_config as Record<string, any> || {},
          hero_image_config: (data as any).hero_image_config as Record<string, any> || {},
          reception_floor_plan_config: (data as any).reception_floor_plan_config as Record<string, any> || {},
        });
      }
      return false;
    } finally { setSaving(false); }
  };

  return {
    settings,
    loading,
    saving,
    updateModuleConfig,
    refreshSettings: () => setRevision(value => value + 1),
  };
};
