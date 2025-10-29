import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AlbumStats {
  total: number;
  photos: number;
  videos: number;
  audio: number;
  guestbook: number;
  pending: number;
  hidden: number;
}

export const useAlbumStats = (eventId: string | null) => {
  const [stats, setStats] = useState<AlbumStats>({
    total: 0,
    photos: 0,
    videos: 0,
    audio: 0,
    guestbook: 0,
    pending: 0,
    hidden: 0,
  });

  const [last24h, setLast24h] = useState<{ hour: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!eventId) return;

    try {
      // Fetch media stats
      const { data: mediaData } = await supabase
        .from('media_items')
        .select('type, status, visibility')
        .eq('event_id', eventId);

      // Fetch guestbook count
      const { count: guestbookCount } = await supabase
        .from('guestbook_messages')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      const newStats = {
        total: mediaData?.length || 0,
        photos: mediaData?.filter(m => m.type === 'photo').length || 0,
        videos: mediaData?.filter(m => m.type === 'video').length || 0,
        audio: mediaData?.filter(m => m.type === 'audio').length || 0,
        guestbook: guestbookCount || 0,
        pending: mediaData?.filter(m => m.status === 'uploading' || m.status === 'processing').length || 0,
        hidden: mediaData?.filter(m => m.visibility === 'hidden').length || 0,
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLast24h = async () => {
    if (!eventId) return;

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data } = await supabase
        .from('media_items')
        .select('created_at')
        .eq('event_id', eventId)
        .gte('created_at', yesterday.toISOString());

      // Group by hour
      const hourlyData = new Array(24).fill(0).map((_, i) => ({
        hour: `${i}:00`,
        count: 0,
      }));

      data?.forEach(item => {
        const hour = new Date(item.created_at).getHours();
        hourlyData[hour].count++;
      });

      setLast24h(hourlyData);
    } catch (error) {
      console.error('Error fetching last 24h data:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLast24h();
  }, [eventId]);

  return { stats, last24h, loading, refetch: fetchStats };
};
