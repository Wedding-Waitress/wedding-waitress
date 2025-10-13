import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to poll for video processing status and trigger refresh when ready
 * Used to show "Processing..." badge and update gallery when videos finish encoding
 */
export const useVideoProcessingPoller = (
  galleryId: string | null,
  onVideoReady?: (mediaId: string) => void
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!galleryId) return;

    const pollProcessingVideos = async () => {
      try {
        // Find videos that are uploaded but not yet ready
        const { data: pendingVideos, error } = await supabase
          .from('media_uploads' as any)
          .select('id, cloudflare_stream_uid, stream_ready')
          .eq('gallery_id', galleryId)
          .eq('post_type', 'video')
          .eq('stream_ready', false)
          .not('cloudflare_stream_uid', 'is', null);

        if (error || !pendingVideos || pendingVideos.length === 0) return;

        console.log(`Found ${pendingVideos.length} videos processing...`);

        // Check status of each pending video
        for (const video of pendingVideos as any[]) {
          try {
            const { data: statusData } = await supabase.functions.invoke(
              'check-stream-video-status',
              { body: { media_upload_id: video.id } }
            );

            if (statusData?.ready) {
              console.log('Video ready:', video.id);
              onVideoReady?.(video.id);
            }
          } catch (error) {
            console.error('Error checking video status:', error);
          }
        }
      } catch (error) {
        console.error('Error in pollProcessingVideos:', error);
      }
    };

    // Poll every 10 seconds
    intervalRef.current = setInterval(pollProcessingVideos, 10000);
    pollProcessingVideos(); // Initial check

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [galleryId, onVideoReady]);
};
