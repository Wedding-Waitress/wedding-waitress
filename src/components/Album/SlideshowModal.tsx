import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Shuffle, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  storage_path: string | null;
  cloudflare_stream_uid: string | null;
  caption: string | null;
}

interface SlideshowModalProps {
  items: MediaItem[];
  onClose: () => void;
}

export const SlideshowModal = ({ items, onClose }: SlideshowModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interval] = useState(6); // seconds
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(true);

  useEffect(() => {
    if (!items.length) return;

    const timer = setInterval(() => {
      if (shuffle) {
        setCurrentIndex(Math.floor(Math.random() * items.length));
      } else {
        setCurrentIndex(prev => {
          if (prev >= items.length - 1) {
            return loop ? 0 : prev;
          }
          return prev + 1;
        });
      }
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [interval, shuffle, loop, items.length]);

  if (!items.length) return null;

  const currentItem = items[currentIndex];

  const getMediaUrl = (item: MediaItem) => {
    if (item.type === 'photo' && item.storage_path) {
      const { data } = supabase.storage.from('media-photos').getPublicUrl(item.storage_path);
      return data.publicUrl;
    }
    return null;
  };

  const CLOUDFLARE_ACCOUNT_ID = 'eb3d698c84b1ccbc60e44e9d5098b5de';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black">
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/50 p-2 rounded-lg">
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-white hover:text-white hover:bg-white/20"
            onClick={() => setShuffle(!shuffle)}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-white hover:text-white hover:bg-white/20"
            onClick={() => setLoop(!loop)}
          >
            <Repeat className="w-4 h-4 mr-2" />
            {loop ? 'Loop: ON' : 'Loop: OFF'}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-white hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Current Media */}
        <div className="w-full h-full flex items-center justify-center">
          {currentItem.type === 'photo' && (
            <img 
              src={getMediaUrl(currentItem) || ''} 
              className="max-w-full max-h-full object-contain"
              alt={currentItem.caption || ''}
            />
          )}
          {currentItem.type === 'video' && currentItem.cloudflare_stream_uid && (
            <iframe
              src={`https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${currentItem.cloudflare_stream_uid}/iframe`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          )}
        </div>

        {/* Progress Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
          {currentIndex + 1} / {items.length}
        </div>
      </DialogContent>
    </Dialog>
  );
};
