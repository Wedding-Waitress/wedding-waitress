import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TextZone {
  id: string;
  label: string;
  type: 'preset' | 'custom';
  preset_field?: string;
  text: string;
  font_family: string;
  font_size: number;
  font_color: string;
  font_weight: string;
  font_style: string;
  text_align: string;
  text_case: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
}

export interface InvitationCardSettings {
  id?: string;
  event_id: string;
  user_id: string;
  background_color: string;
  background_image_url?: string | null;
  background_image_type: 'none' | 'full';
  background_image_x_position: number;
  background_image_y_position: number;
  background_image_opacity: number;
  text_zones: TextZone[];
  font_color: string;
  card_size: string;
  orientation: string;
  created_at?: string;
  updated_at?: string;
}

export const useInvitationCardSettings = (eventId: string | null) => {
  const [settings, setSettings] = useState<InvitationCardSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!eventId) {
      setSettings(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitation_card_settings' as any)
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching invitation card settings:', error);
        return;
      }

      if (data) {
        const d = data as any;
        setSettings({
          ...d,
          background_image_type: d.background_image_type as 'none' | 'full',
          text_zones: (d.text_zones || []) as TextZone[],
        });
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error('Error fetching invitation card settings:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const updateSettings = async (newSettings: Partial<InvitationCardSettings>) => {
    if (!eventId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return false;
      }

      const settingsData = {
        event_id: eventId,
        user_id: user.id,
        ...newSettings,
      };

      let result;
      if (settings?.id) {
        result = await supabase
          .from('invitation_card_settings' as any)
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('invitation_card_settings' as any)
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error updating invitation card settings:', result.error);
        toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
        return false;
      }

      const d = result.data as any;
      setSettings({
        ...d,
        background_image_type: d.background_image_type as 'none' | 'full',
        text_zones: (d.text_zones || []) as TextZone[],
      });
      return true;
    } catch (error) {
      console.error('Error updating invitation card settings:', error);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, updateSettings, refetchSettings: fetchSettings };
};
