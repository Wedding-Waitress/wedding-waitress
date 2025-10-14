import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Share2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MediaLightboxProps {
  open: boolean;
  onClose: () => void;
  items: Array<{
    id: string;
    type: 'photo' | 'video' | 'text';
    file_url?: string;
    thumbnail_url?: string | null;
    cloudflare_stream_uid?: string | null;
    caption?: string;
    created_at?: string;
    mime_type?: string;
  }>;
  initialIndex: number;
  onShareGallery?: () => void;
  galleryId?: string;
  onTrackDownload?: (type: 'single' | 'bulk') => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  open,
  onClose,
  items,
  initialIndex,
  onShareGallery,
  galleryId,
  onTrackDownload,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const { toast } = useToast();

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.type === 'video';
  const isPhoto = currentItem?.type === 'photo';

  // Reset zoom and index when opened
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setIsPlaying(false);
    }
  }, [open, initialIndex]);

  // Autoplay videos when opened/changed
  useEffect(() => {
    if (open && isVideo && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Autoplay failed, user needs to click play
      });
      setIsPlaying(true);
    }
  }, [open, currentIndex, isVideo]);

  // Disable body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case ' ':
          e.preventDefault();
          if (isVideo && videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, isVideo]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    setZoom(1);
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    setZoom(1);
  }, [items.length]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  };

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
    setTouchStart(null);
  };

  // Wheel zoom for photos
  const handleWheel = (e: React.WheelEvent) => {
    if (!isPhoto) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const getVideoUrl = () => {
    if (currentItem.cloudflare_stream_uid) {
      return `https://customer-${currentItem.cloudflare_stream_uid.split('/')[0]}.cloudflarestream.com/${currentItem.cloudflare_stream_uid}/manifest/video.m3u8`;
    }
    return currentItem.file_url || '';
  };

  const getPosterUrl = () => {
    if (currentItem.thumbnail_url) return currentItem.thumbnail_url;
    if (currentItem.cloudflare_stream_uid) {
      return `https://videodelivery.net/${currentItem.cloudflare_stream_uid}/thumbnails/thumbnail.jpg`;
    }
    return undefined;
  };

  const handleDownload = async () => {
    try {
      const url = isVideo ? getVideoUrl() : currentItem.file_url;
      if (!url) return;

      // Track download
      if (onTrackDownload) {
        onTrackDownload('single');
      }

      const filename = `${currentItem.caption || 'media'}-${currentItem.id}.${isVideo ? 'mp4' : 'jpg'}`;
      
      // For Cloudflare Stream, we need to download the video differently
      if (currentItem.cloudflare_stream_uid && isVideo) {
        // Stream doesn't allow direct downloads, so we open in new tab
        window.open(url, '_blank');
        toast({
          title: 'Opening video',
          description: 'Video will open in a new tab. Use browser controls to download.',
        });
        return;
      }

      // For regular files, trigger download
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: 'Download started',
        description: `Downloading ${isVideo ? 'video' : 'photo'}...`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Could not download the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    try {
      const url = isVideo ? getVideoUrl() : currentItem.file_url;
      if (!url) return;

      const shareData = {
        title: currentItem.caption || 'Shared from gallery',
        text: `Check out this ${isVideo ? 'video' : 'photo'}!`,
        url: url,
      };

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: 'Shared successfully',
          description: 'Content shared!',
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(url);
        toast({
          title: '✅ Link copied!',
          description: 'Share link copied to clipboard',
        });
      }
    } catch (error: any) {
      // User cancelled share or clipboard failed
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast({
          title: 'Share failed',
          description: 'Could not share the content. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  if (!currentItem) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-full w-full h-full p-0 bg-gradient-to-br from-primary/95 via-primary-dark/95 to-primary-darker/95 border-0"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full h-full flex flex-col animate-fade-in">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent p-4">
            <div className="flex items-start justify-between text-white">
              <div className="flex-1">
                {currentItem.caption && (
                  <p className="text-lg font-medium mb-1">{currentItem.caption}</p>
                )}
                {currentItem.created_at && (
                  <p className="text-sm opacity-80">
                    {format(new Date(currentItem.created_at), 'PPP')}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={onClose}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Media Content */}
          <div 
            ref={containerRef}
            className="flex-1 flex items-center justify-center overflow-hidden touch-none"
          >
            {isPhoto && currentItem.file_url && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={currentItem.file_url}
                  alt={currentItem.caption || 'Photo'}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoom})` }}
                  draggable={false}
                  decoding="async"
                />
              </div>
            )}

            {isVideo && (
              <div className="relative w-full h-full flex items-center justify-center">
                {currentItem.cloudflare_stream_uid ? (
                  <iframe
                    src={`https://customer-${currentItem.cloudflare_stream_uid.split('/')[0]}.cloudflarestream.com/${currentItem.cloudflare_stream_uid}/iframe`}
                    className="w-full h-full"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={getVideoUrl()}
                    poster={getPosterUrl()}
                    controls
                    autoPlay
                    muted
                    className="max-w-full max-h-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Navigation & Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={handlePrevious}
                disabled={items.length <= 1}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              {/* Zoom Controls (Photos Only) */}
              {isPhoto && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 rounded-full"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                  >
                    <ZoomOut className="w-5 h-5" />
                  </Button>
                  <span className="text-white text-sm min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 rounded-full"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Counter */}
              <div className="text-white text-sm">
                {currentIndex + 1} / {items.length}
              </div>

              {/* Next Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={handleNext}
                disabled={items.length <= 1}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Action Buttons (Download & Share) */}
          <div className="absolute bottom-6 right-6 z-20 flex gap-3 animate-fade-in">
            {/* Share Gallery Button (if handler provided) */}
            {onShareGallery && (
              <Button
                size="icon"
                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-white/90 hover:bg-white text-primary shadow-lg hover:shadow-xl transition-all"
                onClick={onShareGallery}
                title="Share Gallery"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            )}

            {/* Download Button */}
            <Button
              size="icon"
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-white hover:bg-white/90 text-primary shadow-lg hover:shadow-xl transition-all"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="w-5 h-5" />
            </Button>

            {/* Share Item Button */}
            <Button
              size="icon"
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-white hover:bg-white/90 text-primary shadow-lg hover:shadow-xl transition-all"
              onClick={handleShare}
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
