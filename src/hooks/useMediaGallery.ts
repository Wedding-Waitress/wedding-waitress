import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MediaItem {
  id: string;
  event_id: string;
  type: 'image' | 'video';
  caption: string | null;
  file_url: string;
  thumbnail_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  width?: number;
  height?: number;
}

export const useMediaGallery = (galleryId: string | null) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMedia = async () => {
    if (!galleryId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_uploads')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedia((data || []) as MediaItem[]);
    } catch (error: any) {
      console.error('Error fetching media:', error);
      toast({
        title: 'Error',
        description: 'Failed to load media gallery',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [galleryId]);

  // Setup realtime subscription
  useEffect(() => {
    if (!galleryId) return;

    const channel = supabase
      .channel(`media-uploads:gallery:${galleryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_uploads',
          filter: `gallery_id=eq.${galleryId}`,
        },
        (payload) => {
          console.log('Media update:', payload);
          fetchMedia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [galleryId]);

  return { media, loading, refetch: fetchMedia };
};