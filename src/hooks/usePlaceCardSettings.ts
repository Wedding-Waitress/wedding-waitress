import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlaceCardSettings {
  id?: string;
  event_id: string;
  user_id: string;
  font_family: string;
  font_color: string;
  background_color: string;
  background_image_url?: string | null;
  background_image_type: 'none' | 'decorative' | 'full';
  background_image_x_position?: number;
  background_image_y_position?: number;
  background_image_scale?: number;
  background_image_opacity?: number;
  mass_message: string;
  individual_messages: Record<string, string>;
  guest_font_family: string;
  info_font_family: string;
  guest_name_bold: boolean;
  guest_name_italic: boolean;
  guest_name_underline: boolean;
  guest_name_font_size: number;
  info_font_size: number;
  name_spacing: number;
  created_at?: string;
  updated_at?: string;
}

export const usePlaceCardSettings = (eventId: string | null) => {
  const [settings, setSettings] = useState<PlaceCardSettings | null>(null);
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
        .from('place_card_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching place card settings:', error);
        toast({
          title: "Error",
          description: "Failed to fetch place card settings",
          variant: "destructive",
        });
        return;
      }

      setSettings(data ? {
        ...data,
        background_image_type: data.background_image_type as 'none' | 'decorative' | 'full',
        individual_messages: data.individual_messages as Record<string, string>
      } : null);
    } catch (error) {
      console.error('Error fetching place card settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  const updateSettings = async (newSettings: Partial<PlaceCardSettings>) => {
    if (!eventId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save settings",
          variant: "destructive",
        });
        return false;
      }

      const settingsData = {
        event_id: eventId,
        user_id: user.id,
        ...newSettings,
      };

      let result;
      if (settings?.id) {
        // Update existing settings
        result = await supabase
          .from('place_card_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        // Create new settings
        result = await supabase
          .from('place_card_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error updating place card settings:', result.error);
        toast({
          title: "Error",
          description: "Failed to save settings",
          variant: "destructive",
        });
        return false;
      }

      setSettings({
        ...result.data,
        background_image_type: result.data.background_image_type as 'none' | 'decorative' | 'full',
        individual_messages: result.data.individual_messages as Record<string, string>
      });
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
      return true;
    } catch (error) {
      console.error('Error updating place card settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    updateSettings,
    refetchSettings: fetchSettings,
  };
};