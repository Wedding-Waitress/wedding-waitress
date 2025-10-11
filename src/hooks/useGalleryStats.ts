import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GalleryStats {
  galleriesCount: number;
  photosCount: number;
  videosCount: number;
  messagesCount: number;
}

export const useGalleryStats = (galleryId: string | null, scope: 'all' | 'current') => {
  const [stats, setStats] = useState<GalleryStats>({
    galleriesCount: 0,
    photosCount: 0,
    videosCount: 0,
    messagesCount: 0,
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
          .from('galleries')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.user.id);

        // Get media counts with proper join
        let mediaQuery = supabase
          .from('media_uploads')
          .select('post_type, gallery_id!inner(owner_id)')
          .eq('gallery_id.owner_id', user.user.id);

        if (scope === 'current' && galleryId) {
          mediaQuery = mediaQuery.eq('gallery_id', galleryId);
        }

        const { data: mediaData } = await mediaQuery;

        const photosCount = mediaData?.filter(m => m.post_type === 'photo').length || 0;
        const videosCount = mediaData?.filter(m => m.post_type === 'video').length || 0;
        const messagesCount = mediaData?.filter(m => m.post_type === 'text').length || 0;

        setStats({
          galleriesCount: galleriesCount || 0,
          photosCount,
          videosCount,
          messagesCount,
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
