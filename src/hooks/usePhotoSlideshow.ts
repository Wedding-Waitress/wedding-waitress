import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Photo {
  id: string;
  file_url: string;
  created_at: string;
}

export const usePhotoSlideshow = (galleryId: string | null) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch latest 20 photos
  const fetchPhotos = useCallback(async () => {
    if (!galleryId) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('media_uploads')
      .select('id, file_url, created_at')
      .eq('gallery_id', galleryId)
      .eq('status', 'approved')
      .like('mime_type', 'image/%')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setPhotos(data);
      setCurrentIndex(0);
    }
    setIsLoading(false);
  }, [galleryId]);

  // Initial fetch
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Subscribe to new uploads
  useEffect(() => {
    if (!galleryId) return;

    const channel = supabase
      .channel(`gallery-photos:${galleryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media_uploads',
          filter: `gallery_id=eq.${galleryId}`,
        },
        (payload) => {
          const newMedia = payload.new as any;
          // Only add if it's an approved image
          if (newMedia.status === 'approved' && newMedia.mime_type?.startsWith('image/')) {
            setPhotos((prev) => [
              {
                id: newMedia.id,
                file_url: newMedia.file_url,
                created_at: newMedia.created_at,
              },
              ...prev.slice(0, 19), // Keep only 20 latest
            ]);
            setCurrentIndex(0); // Show new photo immediately
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_uploads',
          filter: `gallery_id=eq.${galleryId}`,
        },
        (payload) => {
          const updatedMedia = payload.new as any;
          // If a pending media is approved, add it to the slideshow
          if (updatedMedia.status === 'approved' && updatedMedia.mime_type?.startsWith('image/')) {
            fetchPhotos(); // Refetch to get proper order
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [galleryId, fetchPhotos]);

  // Auto-advance slideshow every 5 seconds
  useEffect(() => {
    if (photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [photos.length]);

  return {
    photos,
    currentIndex,
    isLoading,
    hasPhotos: photos.length > 0,
  };
};
