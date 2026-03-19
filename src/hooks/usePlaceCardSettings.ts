/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Place Cards feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated 300 DPI export system.
 * 
 * Last completed: 2025-10-04
 */

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
  background_image_type: 'none' | 'decorative' | 'full' | 'full_front' | 'full_back';
  background_image_x_position?: number;
  background_image_y_position?: number;
  background_image_scale?: number;
  background_image_opacity?: number;
  front_image_url?: string | null;
  back_image_url?: string | null;
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
  background_behind_names?: boolean;
  background_behind_table_seats?: boolean;
  guest_name_offset_x?: number;
  guest_name_offset_y?: number;
  table_offset_x?: number;
  table_offset_y?: number;
  seat_offset_x?: number;
  seat_offset_y?: number;
  guest_name_rotation?: number;
  table_seat_rotation?: number;
  info_bold: boolean;
  info_italic: boolean;
  info_underline: boolean;
  info_font_color: string;
  created_at?: string;
  updated_at?: string;
}

export const usePlaceCardSettings = (eventId: string | null) => {
  const [settings, setSettings] = useState<PlaceCardSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const saveSeqRef = React.useRef(0);

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
        background_image_type: data.background_image_type as 'none' | 'decorative' | 'full' | 'full_front' | 'full_back',
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

      // Optimistic local state update — ensures React re-renders immediately
      // so DOM reconciler can override any direct style changes from drag
      setSettings(prev => {
        if (prev) return { ...prev, ...newSettings } as PlaceCardSettings;
        // First-save path: seed a local object so UI renders from shared state immediately
        return { event_id: eventId || '', user_id: user.id, font_family: 'Inter', font_color: '#000000', background_color: '#ffffff', background_image_type: 'none' as const, mass_message: '', individual_messages: {}, guest_font_family: 'Great Vibes', info_font_family: 'Beauty Mountains', guest_name_bold: false, guest_name_italic: false, guest_name_underline: false, guest_name_font_size: 40, info_font_size: 16, name_spacing: 4, info_bold: false, info_italic: false, info_underline: false, info_font_color: '#000000', guest_name_offset_x: 0, guest_name_offset_y: 0, table_offset_x: 0, table_offset_y: 0, seat_offset_x: 0, seat_offset_y: 0, guest_name_rotation: 0, table_seat_rotation: 0, ...newSettings } as PlaceCardSettings;
      });

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
        background_image_type: result.data.background_image_type as 'none' | 'decorative' | 'full' | 'full_front' | 'full_back',
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