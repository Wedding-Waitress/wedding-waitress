import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MediaItemLightbox {
  id: string;
  type: 'photo' | 'video' | 'audio';
  storage_path: string | null;
  thumbnail_path: string | null;
  cloudflare_stream_uid: string | null;
  caption: string | null;
  uploader_name?: string | null;
}

interface MediaLightboxProps {
  media: MediaItemLightbox | null;
  allMedia: MediaItemLightbox[];
  onClose: () => void;
  onNavigate: (media: MediaItemLightbox | null) => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  media,
  allMedia,
  onClose,
  onNavigate,
}) => {
  if (!media) return null;

  const currentIndex = allMedia.findIndex(m => m.id === media.id);
  const hasNext = currentIndex < allMedia.length - 1;
  const hasPrev = currentIndex > 0;

  const navigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allMedia.length) {
      onNavigate(allMedia[newIndex]);
    }
  };

  const getMediaUrl = () => {
    if (media.type === 'photo' && media.storage_path) {
      return supabase.storage.from('media-photos').getPublicUrl(media.storage_path).data.publicUrl;
    }
    if (media.type === 'audio' && media.storage_path) {
      return supabase.storage.from('media-audio').getPublicUrl(media.storage_path).data.publicUrl;
    }
    return null;
  };

  const mediaUrl = getMediaUrl();

  return (
    <Dialog open={!!media} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 bg-black border-0">
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Navigation Arrows */}
        {hasPrev && (
          <Button
            onClick={() => navigate('prev')}
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
        )}
        
        {hasNext && (
          <Button
            onClick={() => navigate('next')}
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        )}

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {media.type === 'photo' && mediaUrl && (
            <img
              src={mediaUrl}
              alt={media.caption || ''}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {media.type === 'video' && media.cloudflare_stream_uid && (
            <div className="w-full aspect-video">
              <iframe
                src={`https://customer-${import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${media.cloudflare_stream_uid}/iframe`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

          {media.type === 'audio' && mediaUrl && (
            <div className="text-center space-y-6">
              <Music className="w-24 h-24 mx-auto text-white" />
              {media.uploader_name && (
                <p className="text-white text-lg">{media.uploader_name}</p>
              )}
              <audio
                controls
                src={mediaUrl}
                className="mx-auto"
              />
            </div>
          )}
        </div>

        {/* Caption & Metadata */}
        {(media.caption || media.uploader_name) && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {media.caption && (
              <p className="text-white text-center mb-1">{media.caption}</p>
            )}
            {media.uploader_name && (
              <p className="text-white/70 text-sm text-center">— {media.uploader_name}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
