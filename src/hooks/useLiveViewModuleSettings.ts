import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LiveViewModuleSettings {
  id?: string;
  event_id: string;
  rsvp_invite_config: Record<string, any>;
  search_update_config: Record<string, any>;
  ceremony_config: Record<string, any>;
  reception_config: Record<string, any>;
  video_message_config: Record<string, any>;
  updated_at?: string;
}

export const useLiveViewModuleSettings = (eventId: string | undefined) => {
  const [settings, setSettings] = useState<LiveViewModuleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch settings on mount
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('live_view_module_settings')
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setSettings({
            ...data,
            rsvp_invite_config: data.rsvp_invite_config as Record<string, any>,
            search_update_config: data.search_update_config as Record<string, any>,
            ceremony_config: data.ceremony_config as Record<string, any>,
            reception_config: data.reception_config as Record<string, any>,
            video_message_config: data.video_message_config as Record<string, any>
          });
        } else {
          // Upsert default settings if none exist
          const defaultSettings = {
            event_id: eventId,
            rsvp_invite_config: {},
            search_update_config: {},
            ceremony_config: {},
            reception_config: {},
            video_message_config: {}
          };

          const { data: newData, error: upsertError } = await supabase
            .from('live_view_module_settings')
            .upsert(defaultSettings)
            .select()
            .single();

          if (upsertError) throw upsertError;
          setSettings({
            ...newData,
            rsvp_invite_config: newData.rsvp_invite_config as Record<string, any>,
            search_update_config: newData.search_update_config as Record<string, any>,
            ceremony_config: newData.ceremony_config as Record<string, any>,
            reception_config: newData.reception_config as Record<string, any>,
            video_message_config: newData.video_message_config as Record<string, any>
          });
        }
      } catch (error) {
        console.error('Error fetching module settings:', error);
        toast({
          title: 'Error loading module settings',
          description: 'Could not load module configuration.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [eventId, toast]);

  // Update a specific module's config
  const updateModuleConfig = async (
    module: keyof Omit<LiveViewModuleSettings, 'id' | 'event_id' | 'updated_at'>,
    config: Record<string, any>
  ) => {
    if (!eventId || !settings) return;

    try {
      // Optimistic update
      setSettings(prev => prev ? { ...prev, [module]: config } : null);

      const { error } = await supabase
        .from('live_view_module_settings')
        .update({ [module]: config })
        .eq('event_id', eventId);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Module configuration updated successfully.'
      });
    } catch (error) {
      console.error('Error updating module config:', error);
      toast({
        title: 'Error saving settings',
        description: 'Could not update module configuration.',
        variant: 'destructive'
      });
      
      // Revert optimistic update on error
      const { data } = await supabase
        .from('live_view_module_settings')
        .select('*')
        .eq('event_id', eventId)
        .single();
      
      if (data) {
        setSettings({
          ...data,
          rsvp_invite_config: data.rsvp_invite_config as Record<string, any>,
          search_update_config: data.search_update_config as Record<string, any>,
          ceremony_config: data.ceremony_config as Record<string, any>,
          reception_config: data.reception_config as Record<string, any>,
          video_message_config: data.video_message_config as Record<string, any>
        });
      }
    }
  };

  return {
    settings,
    loading,
    updateModuleConfig
  };
};
