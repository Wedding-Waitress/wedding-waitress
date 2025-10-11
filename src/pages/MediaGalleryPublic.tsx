import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getThemeById } from '@/lib/mediaConstants';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventSlug) {
      fetchGalleryData();
    }
  }, [eventSlug]);

  const fetchGalleryData = async () => {
    try {
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
      setMedia((mediaData as any[])?.map(item => ({
        ...item,
        post_type: item.type || 'photo',
        text_content: null,
        theme_id: null,
      })) || []);
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
          <CardContent className="p-8 text-center">
            <p className="text-lg">Event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayDate = eventData.event_date_override || eventData.date;
  const displayName = eventData.event_display_name || eventData.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">{displayName}</h1>
          <p className="text-xl opacity-90">
            {format(new Date(displayDate), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Sticky Add Button */}
      <div className="sticky top-4 z-50 px-4 py-4 flex justify-center">
        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg"
          onClick={() => navigate(`/media/${eventSlug}`)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add to Album
        </Button>
      </div>

      {/* Masonry Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {media.length === 0 ? (
          <Card className="ww-box max-w-md mx-auto">
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-xl font-semibold">No photos yet</h3>
              <p className="text-muted-foreground">
                Be the first to add memories to this album!
              </p>
              <Button
                className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 mt-4"
                onClick={() => navigate(`/media/${eventSlug}`)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Photos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {media.map((item) => {
              const theme = item.theme_id ? getThemeById(item.theme_id) : null;
              
              return (
                <Card
                  key={item.id}
                  className="break-inside-avoid mb-4 overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  {item.post_type === 'photo' && (
                    <img
                      src={getMediaUrl(item.file_url)}
                      alt={item.caption || ''}
                      className="w-full h-auto"
                    />
                  )}
                  {item.post_type === 'video' && (
                    <video
                      src={getMediaUrl(item.file_url)}
                      className="w-full h-auto"
                      controls
                    />
                  )}
                  {item.post_type === 'text' && theme && (
                    <div
                      className="p-8 min-h-[200px] flex items-center justify-center"
                      style={{ background: theme.bgColor }}
                    >
                      <p 
                        className="text-xl text-center font-medium break-words"
                        style={{ color: theme.textColor }}
                      >
                        {item.text_content}
                      </p>
                    </div>
                  )}
                  {item.caption && (
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{item.caption}</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Made with ❤️ Wedding Waitress
        </p>
      </div>
    </div>
  );
};
