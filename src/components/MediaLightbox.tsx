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
    seq_number?: number;
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
  const [viewMode, setViewMode] = useState<'true-size' | 'fit-to-screen'>('true-size');
  const [naturalDimensions, setNaturalDimensions] = useState<{width: number, height: number} | null>(null);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number, y: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const { toast } = useToast();

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.type === 'video';
  const isPhoto = currentItem?.type === 'photo';

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setViewMode('true-size');
      setPanPosition({ x: 0, y: 0 });
      setNaturalDimensions(null);
      setIsPlaying(false);
    }
  }, [open, initialIndex]);

  // Detect image natural dimensions
  useEffect(() => {
    if (!open || !isPhoto || !currentItem?.file_url) return;
    
    const img = new Image();
    img.onload = () => {
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      
      // Auto-switch to fit-to-screen if image is smaller than viewport
      if (img.naturalWidth <= window.innerWidth && img.naturalHeight <= window.innerHeight) {
        setViewMode('fit-to-screen');
      } else {
        setViewMode('true-size');
      }
      setPanPosition({ x: 0, y: 0 });
    };
    img.src = currentItem.file_url;
  }, [currentIndex, open, currentItem, isPhoto]);

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

  const imageNeedsToggle = naturalDimensions && 
    (naturalDimensions.width > window.innerWidth || naturalDimensions.height > window.innerHeight);

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
        case 'z':
        case 'Z':
          if (isPhoto && imageNeedsToggle) {
            e.preventDefault();
            toggleViewMode();
          }
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
  }, [open, currentIndex, isVideo, viewMode, imageNeedsToggle]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    setPanPosition({ x: 0, y: 0 });
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    setPanPosition({ x: 0, y: 0 });
  }, [items.length]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'true-size' ? 'fit-to-screen' : 'true-size');
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPhoto && imageNeedsToggle && viewMode === 'true-size') {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStart && naturalDimensions) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      
      // Calculate bounds
      const maxX = Math.max(0, (naturalDimensions.width - window.innerWidth) / 2);
      const maxY = Math.max(0, (naturalDimensions.height - window.innerHeight) / 2);
      
      setPanPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPhoto && imageNeedsToggle && viewMode === 'true-size') {
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX - panPosition.x, y: touch.clientY - panPosition.y });
      setIsPanning(true);
    } else {
      setTouchStart(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && panStart && naturalDimensions) {
      const touch = e.touches[0];
      const newX = touch.clientX - panStart.x;
      const newY = touch.clientY - panStart.y;
      
      // Calculate bounds
      const maxX = Math.max(0, (naturalDimensions.width - window.innerWidth) / 2);
      const maxY = Math.max(0, (naturalDimensions.height - window.innerHeight) / 2);
      
      setPanPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

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

  const handleImageClick = () => {
    if (isPhoto && imageNeedsToggle && !isPanning) {
      toggleViewMode();
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

      // Import filename utility dynamically
      const { generateMediaFilename } = await import('@/lib/mediaFilenames');
      const { supabase } = await import('@/integrations/supabase/client');

      // Fetch gallery info for filename
      let albumTitle = 'Album';
      if (galleryId) {
        const { data: gallery } = await supabase
          .from('galleries')
          .select('title')
          .eq('id', galleryId)
          .single();
        if (gallery) albumTitle = gallery.title;
      }

      // Determine type and generate filename
      const type = isVideo ? 'Video' : 'Photo';
      const seqNumber = currentItem.seq_number || 0;
      const mimeType = currentItem.mime_type;
      
      const filename = generateMediaFilename({
        seqNumber,
        type,
        albumTitle,
        mimeType,
        fileUrl: url,
      });

      // For Cloudflare Stream videos, open in new tab (they handle their own download)
      if (currentItem.cloudflare_stream_uid && isVideo) {
        window.open(url, '_blank');
        toast({
          title: "Opening video",
          description: "Video will open in a new tab. Use browser controls to download.",
        });
        return;
      }

      // For regular files, download directly with proper filename
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
        title: "Download started",
        description: filename,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download the file",
        variant: "destructive",
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
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Left Navigation Arrow */}
            {items.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 text-white bg-black/30 hover:bg-black/50 rounded-full transition-all animate-fade-in"
                onClick={handlePrevious}
                title="Previous (←)"
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}

            {/* Right Navigation Arrow */}
            {items.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 text-white bg-black/30 hover:bg-black/50 rounded-full transition-all animate-fade-in"
                onClick={handleNext}
                title="Next (→)"
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}

            {isPhoto && currentItem.file_url && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  ref={imageRef}
                  src={currentItem.file_url}
                  alt={currentItem.caption || 'Photo'}
                  className={viewMode === 'fit-to-screen' ? 'max-w-full max-h-full object-contain' : 'transition-all duration-200'}
                  style={viewMode === 'true-size' ? {
                    maxWidth: '100vw',
                    maxHeight: '100vh',
                    width: 'auto',
                    height: 'auto',
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
                    cursor: imageNeedsToggle ? (isPanning ? 'grabbing' : 'grab') : 'default',
                    userSelect: 'none',
                  } : undefined}
                  draggable={false}
                  decoding="async"
                  onClick={handleImageClick}
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

              {/* View Mode Toggle removed - Z key still works */}

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
