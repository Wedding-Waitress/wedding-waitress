import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GalleryAnalytics {
  total_views: number;
  unique_sessions: number;
  total_shares: number;
  total_downloads: number;
  last_activity: string | null;
}

export const useGalleryAnalytics = (galleryId: string | null) => {
  const [analytics, setAnalytics] = useState<GalleryAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    if (!galleryId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_gallery_analytics_summary', {
        _gallery_id: galleryId,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setAnalytics(data[0]);
      } else {
        setAnalytics({
          total_views: 0,
          unique_sessions: 0,
          total_shares: 0,
          total_downloads: 0,
          last_activity: null,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscription for updates
    if (!galleryId) return;

    const channel = supabase
      .channel(`analytics:${galleryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gallery_analytics',
          filter: `gallery_id=eq.${galleryId}`,
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [galleryId]);

  return { analytics, loading, refetch: fetchAnalytics };
};
