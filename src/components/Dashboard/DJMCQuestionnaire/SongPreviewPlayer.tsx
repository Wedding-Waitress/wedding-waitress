import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SongPreviewPlayerProps {
  url: string;
  onClose: () => void;
}

export const SongPreviewPlayer: React.FC<SongPreviewPlayerProps> = ({ url, onClose }) => {
  const getEmbedUrl = () => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop()?.split('?')[0]
        : new URLSearchParams(new URL(url).search).get('v');
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes('spotify.com')) {
      const match = url.match(/track\/([a-zA-Z0-9]+)/);
      if (match) return `https://open.spotify.com/embed/track/${match[1]}`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl();
  if (!embedUrl) return null;

  return (
    <div className="relative bg-background rounded-lg border p-2 mt-2">
      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10" onClick={onClose}>
        <X className="w-4 h-4" />
      </Button>
      <iframe
        src={embedUrl}
        width="100%"
        height="80"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="rounded"
      />
    </div>
  );
};
