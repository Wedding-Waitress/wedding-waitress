import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MediaGallerySettings {
  id: string;
  event_id: string;
  is_active: boolean;
  require_approval: boolean;
  max_uploads_per_guest: number;
  allow_photos: boolean;
  allow_videos: boolean;
  slideshow_interval_seconds: number;
  show_captions: boolean;
}

export const useMediaGallerySettings = (eventId: string | null) => {
  const [settings, setSettings] = useState<MediaGallerySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_gallery_settings')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<MediaGallerySettings>) => {
    if (!eventId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('media_gallery_settings')
        .upsert({
          event_id: eventId,
          user_id: user.user.id,
          ...newSettings,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });

      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [eventId]);

  return { settings, loading, saveSettings, refetch: fetchSettings };
};