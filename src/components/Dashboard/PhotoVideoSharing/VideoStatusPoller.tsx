import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VideoStatusPollerProps {
  galleryId: string | null;
  onStatusUpdate?: () => void;
}

/**
 * VideoStatusPoller - Automatically polls Cloudflare Stream API
 * for videos that are still processing and updates the database
 * when they become ready.
 * 
 * This is an invisible component that runs in the background.
 */
export const VideoStatusPoller: React.FC<VideoStatusPollerProps> = ({
  galleryId,
  onStatusUpdate
}) => {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!galleryId) return;

    const checkPendingVideos = async () => {
      try {
        // Query for videos that are not ready yet
        const { data: pendingVideos, error } = await supabase
          .from('media_uploads' as any)
          .select('id, cloudflare_stream_uid, stream_status')
          .eq('gallery_id', galleryId)
          .eq('post_type', 'video')
          .eq('stream_ready', false)
          .not('cloudflare_stream_uid', 'is', null)
          .in('stream_status', ['queued', 'encoding']);

        if (error) {
          console.error('Error fetching pending videos:', error);
          return;
        }

        const videos = pendingVideos as any[];
        if (!videos || videos.length === 0) {
          // No pending videos, can stop polling
          return;
        }

        console.log(`Found ${videos.length} pending videos, checking status...`);

        // Check status for each pending video
        for (const video of videos) {
          try {
            const { data, error: statusError } = await supabase.functions.invoke(
              'check-stream-video-status',
              {
                body: {
                  media_upload_id: video.id,
                },
              }
            );

            if (statusError) {
              console.error('Error checking video status:', statusError);
              continue;
            }

            console.log('Video status checked:', data);

            // If video became ready, trigger refresh
            if (data.ready && onStatusUpdate) {
              onStatusUpdate();
            }
          } catch (err) {
            console.error('Error checking individual video:', err);
          }
        }
      } catch (err) {
        console.error('Error in checkPendingVideos:', err);
      }
    };

    // Check immediately on mount
    checkPendingVideos();

    // Then poll every 10 seconds
    intervalRef.current = window.setInterval(checkPendingVideos, 10000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [galleryId, onStatusUpdate]);

  // This component doesn't render anything
  return null;
};
