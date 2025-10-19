import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GalleryStats {
  galleriesCount: number;
  photosCount: number;
  videosCount: number;
  messagesCount: number;
  audioCount: number;
}

export const useGalleryStats = (galleryId: string | null, scope: 'all' | 'current') => {
  const [stats, setStats] = useState<GalleryStats>({
    galleriesCount: 0,
    photosCount: 0,
    videosCount: 0,
    messagesCount: 0,
    audioCount: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        // Get galleries count
        const { count: galleriesCount } = await supabase
          .from('galleries' as any)
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.user.id);

        // Get media counts (RLS handles owner filtering)
        let mediaQuery = supabase
          .from('media_uploads' as any)
          .select('post_type, gallery_id');

        if (scope === 'current' && galleryId) {
          mediaQuery = mediaQuery.eq('gallery_id', galleryId);
        }

        const { data: mediaData } = await mediaQuery;

        const photosCount = (mediaData as any)?.filter((m: any) => m.post_type === 'photo').length || 0;
        const videosCount = (mediaData as any)?.filter((m: any) => m.post_type === 'video').length || 0;
        const messagesCount = (mediaData as any)?.filter((m: any) => m.post_type === 'text').length || 0;

        // Get audio count (RLS handles owner filtering)
        let audioQuery = supabase
          .from('audio_guestbook' as any)
          .select('id', { count: 'exact', head: true });

        if (scope === 'current' && galleryId) {
          audioQuery = audioQuery.eq('gallery_id', galleryId);
        }

        const { count: audioCount } = await audioQuery;

        setStats({
          galleriesCount: galleriesCount || 0,
          photosCount,
          videosCount,
          messagesCount,
          audioCount: audioCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [galleryId, scope]);

  return { stats, loading };
};
