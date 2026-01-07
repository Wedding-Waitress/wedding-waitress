import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QRCodeSettings {
  id?: string;
  event_id: string;
  user_id: string;
  shape: string;
  pattern: string;
  pattern_style: string;
  background_color: string;
  foreground_color: string;
  background_image_url?: string;
  center_image_url?: string;
  corner_style: string;
  has_scan_text: boolean;
  scan_text: string;
  gradient_type: string;
  gradient_colors: any[];
  border_style: string;
  border_width: number;
  border_color: string;
  shadow_enabled: boolean;
  shadow_blur: number;
  shadow_color: string;
  center_image_size: number;
  background_opacity: number;
  output_size: number;
  output_format: string;
  color_palette: string;
  advanced_settings: any;
  // Enhanced QR customization fields
  dots_color: string;
  marker_border_color: string;
  marker_center_color: string;
  dots_shape: 'square' | 'rounded' | 'circle' | 'diamond' | 'plus' | 'vertical' | 'horizontal';
  marker_border_shape: 'square' | 'rounded' | 'circle';
  marker_center_shape: 'square' | 'circle';
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_QR_SETTINGS: Partial<QRCodeSettings> = {
  shape: 'square',
  pattern: 'basic',
  pattern_style: 'basic',
  background_color: '#ffffff',
  foreground_color: '#000000',
  corner_style: 'square',
  has_scan_text: false,
  scan_text: '',
  gradient_type: 'none',
  gradient_colors: [],
  border_style: 'none',
  border_width: 0,
  border_color: '#000000',
  shadow_enabled: false,
  shadow_blur: 10,
  shadow_color: '#00000033',
  center_image_size: 25,
  background_opacity: 1.0,
  output_size: 1024,
  output_format: 'png',
  color_palette: 'default',
  advanced_settings: {},
  // Enhanced defaults
  dots_color: '#000000',
  marker_border_color: '#000000',
  marker_center_color: '#000000',
  dots_shape: 'square',
  marker_border_shape: 'square',
  marker_center_shape: 'square',
};

export const useQRCodeSettings = (eventId: string | null) => {
  const [settings, setSettings] = useState<QRCodeSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!eventId) {
      setSettings(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('qr_code_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching QR settings:', error);
        toast({
          title: "Error",
          description: "Failed to fetch QR code settings",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        // Ensure gradient_colors is always an array and merge with defaults
        const processedData = {
          ...DEFAULT_QR_SETTINGS,
          ...data,
          gradient_colors: Array.isArray(data.gradient_colors) ? data.gradient_colors : []
        };
        setSettings(processedData as QRCodeSettings);
      } else {
        // Create default settings if none exist
        const defaultSettings: Partial<QRCodeSettings> = {
          ...DEFAULT_QR_SETTINGS,
          event_id: eventId,
        };
        setSettings(defaultSettings as QRCodeSettings);
      }
    } catch (error) {
      console.error('Error fetching QR settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<QRCodeSettings>) => {
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

      const settingsToSave = {
        ...newSettings,
        event_id: eventId,
        user_id: user.id,
      };

      let result;
      if (settings?.id) {
        // Update existing settings
        result = await supabase
          .from('qr_code_settings')
          .update(settingsToSave)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        // Create new settings
        result = await supabase
          .from('qr_code_settings')
          .insert(settingsToSave)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving QR settings:', result.error);
        toast({
          title: "Error",
          description: "Failed to save QR code settings",
          variant: "destructive",
        });
        return false;
      }

      setSettings(result.data);
      toast({
        title: "Success",
        description: "QR code settings saved successfully",
      });
      return true;
    } catch (error) {
      console.error('Error saving QR settings:', error);
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
  }, [eventId]);

  return {
    settings,
    loading,
    saveSettings,
    refetch: fetchSettings,
  };
};
