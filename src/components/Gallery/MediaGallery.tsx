import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Play, Music } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MediaLightbox } from './MediaLightbox';
import { ProcessingPill } from './ProcessingPill';

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  storage_path: string | null;
  thumbnail_path: string | null;
  cloudflare_stream_uid: string | null;
  caption: string | null;
  status: string;
  created_at: string;
  uploader_name?: string | null;
}

interface MediaGalleryProps {
  eventId: string;
  onBack: () => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ eventId, onBack }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    fetchMedia();
    
    // Real-time subscription for new uploads
    const subscription = supabase
      .channel(`gallery:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'media_items',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMedia(prev => [payload.new as MediaItem, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setMedia(prev => prev.map(item => 
            item.id === payload.new.id ? payload.new as MediaItem : item
          ));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('media_items')
        .select('id, type, storage_path, thumbnail_path, cloudflare_stream_uid, caption, status, created_at, uploader_name')
        .eq('event_id', eventId)
        .in('status', ['processing', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedia((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gallery</h2>
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No media yet</p>
          <p className="text-sm text-muted-foreground mt-2">Be the first to share a memory!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {media.map(item => (
            <MediaTile
              key={item.id}
              item={item}
              onClick={() => item.status === 'ready' && setSelectedMedia(item)}
            />
          ))}
        </div>
      )}

      <MediaLightbox
        media={selectedMedia}
        allMedia={media.filter(m => m.status === 'ready')}
        onClose={() => setSelectedMedia(null)}
        onNavigate={(media) => setSelectedMedia(media as MediaItem)}
      />
    </div>
  );
};

const MediaTile: React.FC<{ item: MediaItem; onClick: () => void }> = ({ item, onClick }) => {
  const getThumbnailUrl = () => {
    if (item.thumbnail_path) {
      return supabase.storage.from('media-thumbs').getPublicUrl(item.thumbnail_path).data.publicUrl;
    }
    if (item.type === 'photo' && item.storage_path) {
      return supabase.storage.from('media-photos').getPublicUrl(item.storage_path).data.publicUrl;
    }
    return null;
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <div
      onClick={onClick}
      className={`relative aspect-square rounded-lg overflow-hidden bg-muted ${
        item.status === 'ready' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      }`}
    >
      {item.status === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <ProcessingPill />
        </div>
      )}

      {item.type === 'photo' && thumbnailUrl && (
        <img src={thumbnailUrl} alt={item.caption || ''} className="w-full h-full object-cover" />
      )}
      
      {item.type === 'video' && (
        <>
          {thumbnailUrl && (
            <img src={thumbnailUrl} alt={item.caption || ''} className="w-full h-full object-cover" />
          )}
          {item.status === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-12 h-12 text-white" fill="white" />
            </div>
          )}
        </>
      )}
      
      {item.type === 'audio' && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          <Music className="w-12 h-12 text-white" />
        </div>
      )}
    </div>
  );
};
