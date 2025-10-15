import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, MessageSquare, Loader2, Phone, Play, Pause, Download, Share2, Presentation, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MediaLightbox } from '@/components/MediaLightbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import logoImage from '@/assets/wedding-waitress-logo.png';
import weddingWaitressLogo from '@/assets/wedding-waitress-logo-full-brand.png';
import { generateMediaFilename, getMediaTypeLabel } from '@/lib/mediaFilenames';

interface AlbumViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  galleryTitle: string;
}

interface MediaItem {
  id: string;
  post_type: string;
  mime_type?: string;
  file_url?: string;
  thumbnail_url?: string;
  cloudflare_stream_uid?: string;
  caption?: string;
  text_content?: string;
  created_at: string;
  width?: number;
  height?: number;
  status?: string;
  seq_number?: number;
}

interface AudioItem {
  id: string;
  file_url: string;
  duration_seconds: number;
  created_at: string;
  mime_type?: string;
  seq_number?: number;
}

export const AlbumViewModal: React.FC<AlbumViewModalProps> = ({
  isOpen,
  onClose,
  galleryId,
  galleryTitle,
}) => {
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [messages, setMessages] = useState<MediaItem[]>([]);
  const [audioMessages, setAudioMessages] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxItems, setLightboxItems] = useState<any[]>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Preparing your memories…');
  const [totalItems, setTotalItems] = useState(0);
  const [loadedItems, setLoadedItems] = useState(0);
  const [currentMediaId, setCurrentMediaId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Rotating loading messages
  const loadingMessages = [
    'Preparing your memories…',
    'Loading your special moments…',
    'Almost there…',
    'Gathering beautiful photos…',
    'Just a moment…',
    'Making everything perfect…'
  ];

  useEffect(() => {
    if (isOpen && galleryId) {
      setIsInitialLoad(true);
      setLoadProgress(0);
      setLoadedItems(0);
      fetchGalleryContent();
    }
  }, [isOpen, galleryId]);

  // Rotate loading messages
  useEffect(() => {
    if (loading && isInitialLoad) {
      const interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [loading, isInitialLoad]);

  const fetchGalleryContent = async () => {
    setLoading(true);
    setLoadProgress(0);
    setLoadedItems(0);
    try {
      // Simulate progress
      setLoadProgress(10);
      
      // Fetch gallery info including event_date and owner_id
      const { data: galleryData, error: galleryError } = await supabase
        .from('galleries')
        .select('event_date, owner_id')
        .eq('id', galleryId)
        .single();

      if (galleryError) {
        console.error('Error fetching gallery:', galleryError);
      } else if (galleryData) {
        if (galleryData.event_date) {
          setEventDate(galleryData.event_date);
        }
        
        // Check if current user is owner
        const { data: { user } } = await supabase.auth.getUser();
        setIsOwner(user?.id === galleryData.owner_id);
      }
      
      setLoadProgress(30);

      // Fetch media uploads
      const { data, error } = await supabase
        .from('media_uploads')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLoadProgress(60);

      if (data) {
        const photosData = data.filter((item: MediaItem) => 
          item.mime_type?.startsWith('image/') || item.post_type === 'photo'
        );
        const videosData = data.filter((item: MediaItem) => 
          item.mime_type?.startsWith('video/') || item.post_type === 'video'
        );
        const messagesData = data.filter((item: MediaItem) => item.post_type === 'text');
        
        setPhotos(photosData);
        setVideos(videosData);
        setMessages(messagesData);
        
        const total = photosData.length + videosData.length + messagesData.length;
        setTotalItems(total);
        setLoadedItems(total);
      }

      setLoadProgress(85);

      // Fetch audio guestbook messages
      const { data: audioData, error: audioError } = await supabase
        .from('audio_guestbook' as any)
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (audioError) {
        console.error('Error fetching audio:', audioError);
      } else if (audioData) {
        setAudioMessages((audioData as any) || []);
        setTotalItems(prev => prev + ((audioData as any)?.length || 0));
        setLoadedItems(prev => prev + ((audioData as any)?.length || 0));
      }
      
      setLoadProgress(100);
      
      // Keep showing 100% briefly before fade out
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching gallery content:', error);
      setLoadProgress(100);
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLoading = () => {
    setIsInitialLoad(false);
    setLoading(false);
    onClose();
  };

  const getImageUrl = (item: MediaItem) => {
    if (!item.file_url) return '';
    
    // Remove 'event-media/' prefix if present, then get public URL
    const filePath = item.file_url.startsWith('event-media/') 
      ? item.file_url.replace('event-media/', '') 
      : item.file_url;
    
    return supabase.storage.from('event-media').getPublicUrl(filePath).data.publicUrl;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = format(date, 'EEEE'); // Full day name
    const day = format(date, 'd'); // Day number
    const month = format(date, 'MMMM'); // Full month name
    const year = format(date, 'yyyy'); // Full year
    
    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `${dayName} ${day}${getOrdinalSuffix(parseInt(day))}, ${month} ${year}`;
  };

  const openLightbox = (items: MediaItem[], index: number) => {
    // Save current scroll position
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollTop);
    }
    
    const formattedItems = items.map(item => ({
      id: item.id,
      type: item.post_type === 'photo' ? 'photo' : 'video',
      file_url: getImageUrl(item),
      thumbnail_url: item.thumbnail_url,
      cloudflare_stream_uid: item.cloudflare_stream_uid,
      caption: item.caption,
      created_at: item.created_at,
      mime_type: item.mime_type,
      seq_number: item.seq_number,
    }));
    setLightboxItems(formattedItems);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    // Restore scroll position after lightbox closes
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPosition;
      }
    }, 50);
  };

  const startSlideshow = () => {
    if (photos.length === 0) return;
    setSlideshowIndex(0);
    setSlideshowActive(true);
    setSlideshowPlaying(true);
  };

  const stopSlideshow = () => {
    setSlideshowActive(false);
    setSlideshowPlaying(false);
    if (slideshowTimerRef.current) {
      clearTimeout(slideshowTimerRef.current);
    }
  };

  const toggleSlideshowPlayPause = () => {
    setSlideshowPlaying(!slideshowPlaying);
  };

  const nextSlide = () => {
    setSlideshowIndex((prev) => (prev + 1) % photos.length);
  };

  const previousSlide = () => {
    setSlideshowIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Auto-advance slideshow
  useEffect(() => {
    if (slideshowActive && slideshowPlaying && photos.length > 0) {
      slideshowTimerRef.current = setTimeout(() => {
        nextSlide();
      }, 5000); // 5 seconds per photo

      return () => {
        if (slideshowTimerRef.current) {
          clearTimeout(slideshowTimerRef.current);
        }
      };
    }
  }, [slideshowActive, slideshowPlaying, slideshowIndex, photos.length]);

  // Keyboard controls for slideshow
  useEffect(() => {
    if (!slideshowActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          stopSlideshow();
          break;
        case 'ArrowLeft':
          previousSlide();
          break;
        case 'ArrowRight':
          nextSlide();
          break;
        case ' ':
          e.preventDefault();
          toggleSlideshowPlayPause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideshowActive]);

  const downloadFile = async (url: string, filename: string) => {
    try {
      // Fetch as blob for iOS Safari compatibility
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create object URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download file',
        variant: 'destructive',
      });
    }
  };

  const handleShareGallery = async () => {
    const { data: gallery } = await supabase
      .from('galleries' as any)
      .select('slug')
      .eq('id', galleryId)
      .single();

    if (!gallery) return;

    const galleryUrl = `${window.location.origin}/g/${(gallery as any).slug}?utm_source=share_button`;
    const shareData = {
      title: `🎉 ${galleryTitle} — Wedding Waitress Gallery`,
      text: 'View the full album of photos & videos',
      url: galleryUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: 'Shared successfully',
          description: 'Gallery shared!',
        });
      } else {
        await navigator.clipboard.writeText(galleryUrl);
        toast({
          title: '✅ Gallery link copied!',
          description: 'Share link copied to clipboard',
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast({
          title: 'Share failed',
          description: 'Could not share the gallery. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteMedia = async (itemId: string) => {
    try {
      // Get the media item to find its file_url
      const { data: mediaItem, error: fetchError } = await supabase
        .from('media_uploads')
        .select('file_url, cloudflare_stream_uid')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage if it's a regular file
      if (mediaItem.file_url && !mediaItem.cloudflare_stream_uid) {
        const filePath = mediaItem.file_url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('event-media')
            .remove([filePath]);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('media_uploads')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      // Update local state to remove the deleted item
      setPhotos(prev => prev.filter(item => item.id !== itemId));
      setVideos(prev => prev.filter(item => item.id !== itemId));
      setMessages(prev => prev.filter(item => item.id !== itemId));
      setLightboxItems(prev => prev.filter(item => item.id !== itemId));

    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={scrollContainerRef}
        className="max-w-[90vw] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pb-4 border-b">
            {/* Left: Wedding Waitress Logo */}
            <div className="flex-shrink-0 pl-2">
              <img 
                src={weddingWaitressLogo} 
                alt="Wedding Waitress" 
                className="h-10 w-auto object-contain"
              />
            </div>
            
            {/* Center: Event Name and Date */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <DialogTitle className="text-2xl font-bold text-primary mb-1">
                {galleryTitle}
              </DialogTitle>
              {eventDate && (
                <p className="text-lg text-primary/80">
                  {formatEventDate(eventDate)}
                </p>
              )}
            </div>
            
            {/* Right: Empty spacer for balance */}
            <div className="flex-shrink-0 w-10" />
          </div>
        </DialogHeader>

        <>
          {/* Cinematic Loading Album Overlay - Only on initial load */}
          {loading && isInitialLoad && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
              <div className="relative flex flex-col items-center gap-8 p-8 max-w-md w-full mx-4">
                {/* Pulsing Wedding Waitress Logo */}
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <img 
                    src={logoImage} 
                    alt="Wedding Waitress" 
                    className="relative w-20 h-20 object-contain animate-pulse"
                    style={{ animationDuration: '2s' }}
                  />
                </div>

                {/* Progress Section */}
                <div className="w-full space-y-4">
                  {/* Rotating Message */}
                  <h3 className="text-xl font-semibold text-center text-foreground transition-all duration-500 animate-fade-in">
                    {loadingMessage}
                  </h3>
                  
                  {/* Dynamic Counter */}
                  {totalItems > 0 && (
                    <p className="text-sm text-center text-muted-foreground animate-fade-in">
                      Loading {loadedItems} of {totalItems} {totalItems === 1 ? 'item' : 'items'}…
                    </p>
                  )}

                  {/* Gradient Progress Bar */}
                  <div className="relative w-full h-3 bg-secondary/50 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${loadProgress}%`,
                        background: 'linear-gradient(90deg, #6D28D9 0%, #EC4899 100%)',
                        boxShadow: '0 0 20px rgba(109, 40, 217, 0.5), 0 0 40px rgba(236, 72, 153, 0.3)'
                      }}
                    />
                  </div>

                  {/* Progress Percentage */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {loadProgress}%
                    </span>
                  </div>

                  {/* Album Name */}
                  <div className="text-center mt-4">
                    <p className="text-base font-medium text-primary/80">
                      {galleryTitle}
                    </p>
                    {eventDate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatEventDate(eventDate)}
                      </p>
                    )}
                  </div>

                  {/* Cancel Loading Link */}
                  <div className="text-center mt-6">
                    <button
                      onClick={handleCancelLoading}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    >
                      Cancel Loading
                    </button>
                  </div>
                </div>

                {/* Decorative glow effect */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-t from-primary/10 to-transparent blur-3xl pointer-events-none" />
              </div>
            </div>
          )}

          {/* Content area with fade-in when loading completes */}
          <div className={`transition-opacity duration-1000 ease-out ${loading && isInitialLoad ? 'opacity-0' : 'opacity-100'}`}>
            {/* Owner Actions - Only visible to gallery owner */}
            {isOwner && photos.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 justify-end">
                <Button
                  onClick={startSlideshow}
                  variant="outline"
                  className="gap-2"
                >
                  <Presentation className="w-4 h-4" />
                  Play Slide Show
                </Button>
                <Button
                  onClick={handleShareGallery}
                  variant="outline"
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Album
                </Button>
              </div>
            )}

            <Tabs defaultValue="photos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="photos" className="gap-2">
                <Image className="w-4 h-4" />
                Photos ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2">
                <Video className="w-4 h-4" />
                Videos ({videos.length})
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-2">
                <Phone className="w-4 h-4" />
                Audio ({audioMessages.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="mt-4 animate-fade-in">
              {photos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No photos yet
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {photos.map((photo, index) => {
                    const isActive = currentMediaId === photo.id;
                    return (
                      <button
                        type="button"
                        key={photo.id}
                        className={`relative group overflow-hidden rounded-sm aspect-square bg-black transition-all select-none ${
                          isActive ? 'ring-2 ring-primary' : ''
                        }`}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          userSelect: 'none',
                        }}
                        onClick={() => {
                          setCurrentMediaId(photo.id);
                          openLightbox(photos, index);
                        }}
                        aria-pressed={isActive}
                      >
                      <img
                        src={getImageUrl(photo)}
                        alt={photo.caption || 'Gallery photo'}
                        className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {/* Download Button - Bottom Left */}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              const filename = generateMediaFilename({
                                seqNumber: photo.seq_number || 0,
                                type: 'Photo',
                                albumTitle: galleryTitle,
                                mimeType: photo.mime_type,
                                fileUrl: photo.file_url
                              });
                              
                              await downloadFile(getImageUrl(photo), filename);
                            }}
                            className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors z-10 pointer-events-auto"
                            aria-label="Download photo"
                          >
                            <Download className="w-4 h-4 text-gray-800" />
                          </button>
                          
                          {/* Share Button - Bottom Right */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShareGallery();
                            }}
                            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors pointer-events-auto"
                            aria-label="Share photo"
                          >
                            <Share2 className="w-4 h-4 text-gray-800" />
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                  })}
                  </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="mt-4 animate-fade-in">
              {videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No videos yet
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {videos.map((video, index) => {
                    const isActive = currentMediaId === video.id;
                    return (
                      <button
                        type="button"
                        key={video.id}
                        className={`relative group overflow-hidden rounded-sm aspect-video bg-black transition-all select-none ${
                          isActive ? 'ring-2 ring-primary' : ''
                        }`}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          userSelect: 'none',
                        }}
                        onClick={() => {
                          setCurrentMediaId(video.id);
                          openLightbox(videos, index);
                        }}
                        aria-pressed={isActive}
                      >
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.caption || 'Video thumbnail'}
                          className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center pointer-events-none">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Play Icon - Bottom Right Corner */}
                      <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center pointer-events-none">
                        <Play className="w-5 h-5 text-gray-800 ml-0.5" />
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {/* Download Button - Bottom Left */}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // Generate sequential filename
                              const filename = generateMediaFilename({
                                seqNumber: video.seq_number || 0,
                                type: 'Video',
                                albumTitle: galleryTitle,
                                mimeType: video.mime_type,
                                fileUrl: video.file_url
                              });
                              
                              // Get video URL (Cloudflare Stream or direct upload)
                              let videoUrl = '';
                              if (video.cloudflare_stream_uid) {
                                // For Cloudflare Stream videos, use download endpoint
                                videoUrl = `https://videodelivery.net/${video.cloudflare_stream_uid}/downloads/default.mp4`;
                              } else if (video.file_url) {
                                // For direct uploads, use storage URL
                                const { data } = supabase.storage
                                  .from('event-media')
                                  .getPublicUrl(video.file_url);
                                videoUrl = data.publicUrl;
                              }
                              
                              if (videoUrl) {
                                await downloadFile(videoUrl, filename);
                              }
                            }}
                            className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors z-10"
                            aria-label="Download video"
                          >
                            <Download className="w-4 h-4 text-gray-800" />
                          </button>
                          
                          {/* Share Button - Bottom Right (pushed left to avoid play icon) */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShareGallery();
                            }}
                            className="absolute bottom-14 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors z-10"
                            aria-label="Share video"
                          >
                            <Share2 className="w-4 h-4 text-gray-800" />
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="mt-4 animate-fade-in">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div key={message.id} className="border-2 border-primary rounded-none p-3 bg-card">
                      <p className="text-sm whitespace-pre-wrap">{message.text_content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="mt-4 animate-fade-in">
              {audioMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No audio messages yet
                </div>
              ) : (
                <div className="space-y-3">
                  {audioMessages.map((audio) => {
                    const isPlaying = playingAudioId === audio.id;
                    const formatDuration = (seconds: number) => {
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                    };

                    const handlePlayPause = () => {
                      const audioElement = audioRefs.current[audio.id];
                      
                      // Pause any currently playing audio
                      if (playingAudioId && playingAudioId !== audio.id) {
                        const currentAudio = audioRefs.current[playingAudioId];
                        if (currentAudio) currentAudio.pause();
                      }

                      if (isPlaying) {
                        audioElement?.pause();
                        setPlayingAudioId(null);
                      } else {
                        audioElement?.play();
                        setPlayingAudioId(audio.id);
                      }
                    };

                    const getAudioUrl = () => {
                      return supabase.storage
                        .from('audio-uploads')
                        .getPublicUrl(audio.file_url).data.publicUrl;
                    };

                    return (
                      <Card key={audio.id} className="border-2 border-primary rounded-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Button
                              size="lg"
                              variant={isPlaying ? "default" : "outline"}
                              className="rounded-full w-14 h-14 flex-shrink-0"
                              onClick={handlePlayPause}
                            >
                              {isPlaying ? (
                                <Pause className="w-6 h-6" />
                              ) : (
                                <Play className="w-6 h-6 ml-1" />
                              )}
                            </Button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-pink-600 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground">
                                  {formatDuration(audio.duration_seconds)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(audio.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              
                              {/* Hidden audio element */}
                              <audio
                                ref={(el) => {
                                  if (el) audioRefs.current[audio.id] = el;
                                }}
                                src={getAudioUrl()}
                                onEnded={() => setPlayingAudioId(null)}
                                preload="none"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      </DialogContent>

      {/* Media Lightbox */}
      <MediaLightbox
        open={lightboxOpen}
        onClose={closeLightbox}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        onShareGallery={handleShareGallery}
        galleryId={galleryId}
        canDelete={isOwner}
        onDelete={handleDeleteMedia}
      />

      {/* Slideshow Dialog */}
      {slideshowActive && (
        <Dialog open={slideshowActive} onOpenChange={stopSlideshow}>
          <DialogContent className="max-w-full w-full h-full p-0 bg-black border-0">
            <div className="relative w-full h-full flex items-center justify-center animate-fade-in">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full w-12 h-12"
                onClick={stopSlideshow}
              >
                <X className="w-6 h-6" />
              </Button>

              {/* Current Photo */}
              <img
                src={getImageUrl(photos[slideshowIndex])}
                alt={photos[slideshowIndex]?.caption || 'Slideshow photo'}
                className="max-w-full max-h-full object-contain animate-fade-in"
                key={slideshowIndex}
              />

              {/* Left Navigation Arrow */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-16 h-16 text-white bg-black/30 hover:bg-black/50 rounded-full transition-all"
                onClick={previousSlide}
              >
                <ChevronLeft className="w-10 h-10" />
              </Button>

              {/* Right Navigation Arrow */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-16 h-16 text-white bg-black/30 hover:bg-black/50 rounded-full transition-all"
                onClick={nextSlide}
              >
                <ChevronRight className="w-10 h-10" />
              </Button>

              {/* Bottom Controls */}
              <div className="absolute bottom-6 left-0 right-0 z-40 flex items-center justify-center gap-4">
                {/* Play/Pause Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 text-white bg-black/50 hover:bg-black/70 rounded-full"
                  onClick={toggleSlideshowPlayPause}
                >
                  {slideshowPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </Button>

                {/* Counter */}
                <div className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
                  {slideshowIndex + 1} / {photos.length}
                </div>
              </div>

              {/* Caption */}
              {photos[slideshowIndex]?.caption && (
                <div className="absolute bottom-20 left-0 right-0 z-40 text-center">
                  <p className="text-white text-lg font-medium bg-black/50 px-6 py-3 rounded-full inline-block max-w-2xl">
                    {photos[slideshowIndex].caption}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
