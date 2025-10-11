import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GallerySettings {
  id: string;
  gallery_id: string;
  max_uploads_per_guest: number;
  allow_photos: boolean;
  allow_videos: boolean;
  max_photo_size_mb: number;
  max_video_size_mb: number;
  slideshow_interval_seconds: number;
  show_captions: boolean;
  created_at: string;
  updated_at: string;
}

export const useGallerySettings = (galleryId: string | null) => {
  const [settings, setSettings] = useState<GallerySettings | null>(null);
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
      setSettings(data as any);
    } catch (error: any) {
      console.error('Error fetching gallery settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<GallerySettings>) => {
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
