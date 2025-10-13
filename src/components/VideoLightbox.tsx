import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface VideoLightboxProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
  cloudflareStreamUid?: string | null;
}

export const VideoLightbox: React.FC<VideoLightboxProps> = ({
  open,
  onClose,
  videoUrl,
  posterUrl,
  caption,
  cloudflareStreamUid
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black border-0">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
          
          {/* Video player */}
          {cloudflareStreamUid ? (
            <iframe
              src={`https://customer-${cloudflareStreamUid.split('/')[0]}.cloudflarestream.com/${cloudflareStreamUid}/iframe`}
              className="w-full aspect-video"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          ) : (
            <video
              src={videoUrl}
              poster={posterUrl}
              controls
              autoPlay
              className="w-full aspect-video"
              controlsList="nodownload"
            />
          )}
          
          {/* Caption */}
          {caption && (
            <div className="p-4 bg-black text-white">
              <p className="text-sm">{caption}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
