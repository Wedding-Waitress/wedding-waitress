import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QRCodeSettings {
  id?: string;
  event_id: string;
  user_id: string;
  shape: string;
  pattern: string;
  background_color: string;
  foreground_color: string;
  background_image_url?: string;
  center_image_url?: string;
  corner_style: string;
  has_scan_text: boolean;
  scan_text: string;
  created_at?: string;
  updated_at?: string;
}

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
        setSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings: Partial<QRCodeSettings> = {
          event_id: eventId,
          shape: 'square',
          pattern: 'basic',
          background_color: '#ffffff',
          foreground_color: '#000000',
          corner_style: 'square',
          has_scan_text: true,
          scan_text: 'SCAN ME',
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