import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LiveViewSettings {
  id?: string;
  event_id: string;
  show_rsvp_invite: boolean;
  show_search_update: boolean;
  show_ceremony: boolean;
  show_reception: boolean;
  show_video_message: boolean;
  updated_at?: string;
}

const defaultSettings: Omit<LiveViewSettings, 'event_id'> = {
  show_rsvp_invite: false,
  show_search_update: true,
  show_ceremony: false,
  show_reception: false,
  show_video_message: false,
};

export const useLiveViewSettings = (eventId: string) => {
  const [settings, setSettings] = useState<LiveViewSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_view_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const newSettings = {
          event_id: eventId,
          ...defaultSettings,
        };
        
        const { data: insertedData, error: insertError } = await supabase
          .from('live_view_settings')
          .insert(newSettings)
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(insertedData);
      }
    } catch (error) {
      console.error('Error fetching live view settings:', error);
      toast({
        title: 'Error loading settings',
        description: 'Could not load live view settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof Omit<LiveViewSettings, 'id' | 'event_id' | 'updated_at'>, value: boolean) => {
    if (!settings) return;

    // Optimistic update
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);

    try {
      const { error } = await supabase
        .from('live_view_settings')
        .update({ [key]: value })
        .eq('event_id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating live view setting:', error);
      // Revert optimistic update
      await fetchSettings();
      toast({
        title: 'Error saving setting',
        description: 'Could not save the setting. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [eventId]);

  return {
    settings,
    loading,
    updateSetting,
    refetch: fetchSettings,
  };
};
