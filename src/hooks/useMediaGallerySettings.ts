import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MediaGallerySettings {
  id: string;
  gallery_id: string;
  is_active: boolean;
  require_approval: boolean;
  max_uploads_per_guest: number;
  allow_photos: boolean;
  allow_videos: boolean;
  slideshow_interval_seconds: number;
  show_captions: boolean;
}

export const useMediaGallerySettings = (galleryId: string | null) => {
  const [settings, setSettings] = useState<MediaGallerySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!galleryId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_settings' as any)
        .select('*')
        .eq('gallery_id', galleryId)
        .maybeSingle();

      if (error) throw error;
      setSettings(data as any as MediaGallerySettings | null);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<MediaGallerySettings>) => {
    if (!galleryId) return;

    try {
      const { error } = await supabase
        .from('gallery_settings' as any)
        .upsert({
          gallery_id: galleryId,
          ...newSettings,
        } as any);

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
  }, [galleryId]);

  return { settings, loading, saveSettings, refetch: fetchSettings };
};