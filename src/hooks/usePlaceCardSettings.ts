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

import { useState, useEffect, useCallback, useRef } from 'react';
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
  message_font_family: string;
  message_font_size: number;
  message_font_color: string;
  message_bold: boolean;
  message_italic: boolean;
  message_underline: boolean;
  created_at?: string;
  updated_at?: string;
}

const INSERT_DEFAULTS = {
  font_family: 'Great Vibes',
  font_color: '#000000',
  background_color: '#ffffff',
  background_image_type: 'none',
  mass_message: '',
  individual_messages: {},
  guest_font_family: 'Great Vibes',
  info_font_family: 'Beauty Mountains',
  guest_name_bold: false,
  guest_name_italic: false,
  guest_name_underline: false,
  guest_name_font_size: 40,
  info_font_size: 16,
  name_spacing: 0,
  info_bold: false,
  info_italic: false,
  info_underline: false,
  info_font_color: '#000000',
  guest_name_offset_x: 0,
  guest_name_offset_y: 0,
  table_offset_x: 0,
  table_offset_y: 0,
  seat_offset_x: 0,
  seat_offset_y: 0,
  guest_name_rotation: 0,
  table_seat_rotation: 0,
  message_font_family: 'Beauty Mountains',
  message_font_size: 16,
  message_font_color: '#000000',
  message_bold: false,
  message_italic: false,
  message_underline: false,
};

/** Normalize DB row into typed PlaceCardSettings */
function normalizeRow(row: any): PlaceCardSettings {
  return {
    ...row,
    background_image_type: row.background_image_type as PlaceCardSettings['background_image_type'],
    individual_messages: (row.individual_messages as Record<string, string>) ?? {},
    message_font_family: row.message_font_family || 'Beauty Mountains',
    message_font_size: row.message_font_size ?? 16,
    message_font_color: row.message_font_color || '#000000',
    message_bold: row.message_bold ?? false,
    message_italic: row.message_italic ?? false,
    message_underline: row.message_underline ?? false,
  };
}

export const usePlaceCardSettings = (eventId: string | null) => {
  const [settings, setSettings] = useState<PlaceCardSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  // Mutex: prevents concurrent insert race conditions during first save
  const creatingRef = useRef<Promise<PlaceCardSettings | null> | null>(null);

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

      setSettings(data ? normalizeRow(data) : null);
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

  /**
   * Ensures a settings row exists for the current event.
   * Uses a ref-based mutex so concurrent callers share the same insert promise.
   */
  const ensureSettingsExist = async (userId: string): Promise<PlaceCardSettings | null> => {
    // Already have a persisted row
    if (settings?.id) return settings;

    // Another call is already creating — wait for it
    if (creatingRef.current) return creatingRef.current;

    const promise = (async () => {
      const { data, error } = await supabase
        .from('place_card_settings')
        .insert({
          event_id: eventId!,
          user_id: userId,
          ...INSERT_DEFAULTS,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating place card settings:', error);
        // Might be a duplicate — try fetching instead
        const { data: existing } = await supabase
          .from('place_card_settings')
          .select('*')
          .eq('event_id', eventId!)
          .maybeSingle();
        if (existing) {
          const normalized = normalizeRow(existing);
          setSettings(normalized);
          return normalized;
        }
        return null;
      }

      const normalized = normalizeRow(data);
      setSettings(normalized);
      return normalized;
    })();

    creatingRef.current = promise;
    try {
      return await promise;
    } finally {
      creatingRef.current = null;
    }
  };

  /** Core save logic, optionally silent (no toasts) */
  const saveSettings = async (newSettings: Partial<PlaceCardSettings>, silent = false): Promise<boolean> => {
    if (!eventId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!silent) {
          toast({
            title: "Error",
            description: "You must be logged in to save settings",
            variant: "destructive",
          });
        }
        return false;
      }

      // Step 1: Ensure a base row exists (handles first-time creation safely)
      const baseSettings = await ensureSettingsExist(user.id);
      if (!baseSettings?.id) {
        if (!silent) {
          toast({
            title: "Error",
            description: "Failed to save settings",
            variant: "destructive",
          });
        }
        return false;
      }

      // Step 2: Update the existing row with the caller's changes
      const { data, error } = await supabase
        .from('place_card_settings')
        .update({
          ...newSettings,
          event_id: eventId,
          user_id: user.id,
        })
        .eq('id', baseSettings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating place card settings:', error);
        if (!silent) {
          toast({
            title: "Error",
            description: "Failed to save settings",
            variant: "destructive",
          });
        }
        return false;
      }

      setSettings(normalizeRow(data));
      if (!silent) {
        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating place card settings:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const updateSettings = (newSettings: Partial<PlaceCardSettings>) => saveSettings(newSettings, false);
  const updateSettingsSilent = (newSettings: Partial<PlaceCardSettings>) => saveSettings(newSettings, true);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    updateSettings,
    updateSettingsSilent,
    refetchSettings: fetchSettings,
  };
};
