import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getThemeById } from '@/lib/mediaConstants';
import { VideoStatusPoller } from '@/components/Dashboard/PhotoVideoSharing/VideoStatusPoller';
import weddingWaitressLogo from '@/assets/wedding-waitress-badge-logo.png';

interface MediaItem {
  id: string;
  type: string;
  post_type: string;
  caption: string | null;
  file_url: string;
  thumbnail_url: string | null;
  text_content: string | null;
  theme_id: string | null;
  created_at: string;
  cloudflare_stream_uid: string | null;
  stream_ready: boolean;
  stream_status: string;
  stream_preview_image: string | null;
}

interface EventData {
  id: string;
  name: string;
  event_display_name: string | null;
  date: string;
  event_date_override: string | null;
  slug: string;
}

export const MediaGalleryPublic = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [latestMedia, setLatestMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (eventSlug) {
      fetchGalleryData();
    }
  }, [eventSlug]);

  // Set page title
  useEffect(() => {
    if (eventData?.name) {
      document.title = `${eventData.name} | Wedding Waitress`;
    }
  }, [eventData?.name]);

  const fetchGalleryData = async () => {
    try {
      // Fetch gallery settings first
      const { data: gallery, error: galleryError } = await supabase
        .from('galleries' as any)
        .select('id, title, event_date, show_footer, show_public_gallery, is_active')
        .eq('slug', eventSlug)
        .single();

      if (galleryError) throw galleryError;

      // Check if gallery is visible
      if (!(gallery as any).is_active || !(gallery as any).show_public_gallery) {
        setEventData(null);
        setLoading(false);
        return;
      }

      setShowFooter((gallery as any).show_footer ?? true);
      setGalleryId((gallery as any).id);

      // Fetch event data
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', eventSlug)
        .single();

      if (eventError) throw eventError;
      setEventData(event);

      // Fetch approved media using RPC function
      const { data: mediaData, error: mediaError } = await supabase
        .rpc('get_public_gallery_media', { _event_slug: eventSlug });

      if (mediaError) throw mediaError;
      const formattedMedia = (mediaData as any[])?.map(item => ({
        ...item,
        post_type: item.type || 'photo',
        text_content: null,
        theme_id: null,
        cloudflare_stream_uid: item.cloudflare_stream_uid || null,
        stream_ready: item.stream_ready || false,
        stream_status: item.stream_status || 'pending',
        stream_preview_image: item.stream_preview_image || null,
      })) || [];
      
      setMedia(formattedMedia);
      
      // Set latest media for background
      if (formattedMedia.length > 0) {
        const sorted = [...formattedMedia].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLatestMedia(sorted[0]);
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('event-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <p className="text-lg text-muted-foreground">Loading album...</p>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Card className="ww-box max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <h3 className="text-xl font-semibold">Gallery Not Available</h3>
            <p className="text-muted-foreground">
              This gallery isn't visible right now. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayDate = eventData.event_date_override || eventData.date;
  const displayName = eventData.event_display_name || eventData.name;

  return (
    <div className="min-h-screen relative">
      <VideoStatusPoller galleryId={galleryId} onStatusUpdate={fetchGalleryData} />
      
      {/* Full-screen background layer */}
      {latestMedia && (
        <div className="fixed inset-0 z-0">
          {latestMedia.post_type === 'photo' && (
            <img 
              src={getMediaUrl(latestMedia.file_url)}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
          {latestMedia.post_type === 'video' && latestMedia.stream_preview_image && (
            <img 
              src={latestMedia.stream_preview_image}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
          {latestMedia.post_type === 'text' && latestMedia.theme_id && (
            <div 
              className="w-full h-full"
              style={{ background: getThemeById(latestMedia.theme_id).bgColor }}
            />
          )}
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10">
        {/* Header Badge */}
        <div className="sticky top-0 z-50 flex justify-center pt-4 pb-2">
          <a
            href="https://www.weddingwaitress.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
          >
            <span className="text-sm">💜 Made with</span>
            <img 
              src={weddingWaitressLogo} 
              alt="Wedding Waitress" 
              className="h-5"
            />
          </a>
        </div>

        {/* Event Header */}
        <div className="container mx-auto px-4 py-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
            {displayName}
          </h1>
          {displayDate && (
            <p className="text-white/90 mt-2 drop-shadow-md">
              {format(new Date(displayDate), 'MMMM d, yyyy')}
            </p>
          )}
          
          {/* Add to Album Button */}
          <Button 
            onClick={() => navigate(`/media/${eventSlug}`)}
            className="mt-6 bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-full shadow-xl"
            size="lg"
          >
            📸 Add to Album
          </Button>

          {/* Photo count indicator */}
          {media.length > 0 && (
            <p className="text-white/90 mt-6 text-sm drop-shadow-md">
              {media.length} photo{media.length !== 1 ? 's' : ''}, video{media.length !== 1 ? 's' : ''} & post{media.length !== 1 ? 's' : ''} ⬇️
            </p>
          )}
        </div>

        {/* Media Grid */}
        <div className="container mx-auto px-4 py-8">
          {media.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white drop-shadow-lg text-lg">
                No photos or videos yet. Be the first to share!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {media.map((item) => (
                <div 
                  key={item.id}
                  className="aspect-square bg-white rounded-lg border-4 border-white shadow-lg overflow-hidden"
                >
                  {item.post_type === 'photo' && (
                    <img
                      src={getMediaUrl(item.file_url)}
                      alt={item.caption || ''}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {item.post_type === 'video' && (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      {item.stream_ready && item.cloudflare_stream_uid ? (
                        <iframe
                          src={`https://iframe.cloudflare.com/${item.cloudflare_stream_uid}`}
                          className="w-full h-full"
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                          allowFullScreen
                        />
                      ) : item.stream_status === 'encoding' || item.stream_status === 'queued' ? (
                        <div className="text-white text-center p-2">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
                          <p className="text-xs">Processing...</p>
                        </div>
                      ) : item.stream_preview_image ? (
                        <img
                          src={item.stream_preview_image}
                          alt={item.caption || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={getMediaUrl(item.file_url)}
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {item.post_type === 'text' && item.theme_id && (
                    <div 
                      className="w-full h-full flex items-center justify-center p-3"
                      style={{ 
                        background: getThemeById(item.theme_id).bgColor,
                        color: getThemeById(item.theme_id).textColor
                      }}
                    >
                      <p className="text-xs md:text-sm text-center font-medium line-clamp-6">
                        {item.text_content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="py-8 text-center text-sm">
            <a
              href="https://www.weddingwaitress.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors drop-shadow-md inline-flex items-center gap-2"
            >
              <span>Made with 💜</span>
              <img 
                src={weddingWaitressLogo} 
                alt="Wedding Waitress" 
                className="h-4 inline-block"
              />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
