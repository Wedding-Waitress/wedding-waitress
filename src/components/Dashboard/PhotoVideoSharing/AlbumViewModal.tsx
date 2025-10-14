import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, MessageSquare, Loader2, Phone, Play, Pause, Download, Share2, Presentation, X, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MediaLightbox } from '@/components/MediaLightbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

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
}

interface AudioItem {
  id: string;
  file_url: string;
  duration_seconds: number;
  created_at: string;
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
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && galleryId) {
      fetchGalleryContent();
    }
  }, [isOpen, galleryId]);

  const fetchGalleryContent = async () => {
    setLoading(true);
    setLoadProgress(0);
    try {
      // Simulate progress
      setLoadProgress(20);
      
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
      
      setLoadProgress(50);

      // Fetch media uploads
      const { data, error } = await supabase
        .from('media_uploads')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLoadProgress(75);

      if (data) {
        setPhotos(data.filter((item: MediaItem) => 
          item.mime_type?.startsWith('image/') || item.post_type === 'photo'
        ));
        setVideos(data.filter((item: MediaItem) => 
          item.mime_type?.startsWith('video/') || item.post_type === 'video'
        ));
        setMessages(data.filter((item: MediaItem) => item.post_type === 'text'));
      }

      setLoadProgress(90);

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
      }
      
      setLoadProgress(100);
      
      // Keep showing 100% briefly before fade out
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching gallery content:', error);
      setLoadProgress(100);
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (item: MediaItem) => {
    if (!item.file_url) return '';
    
    // Remove 'event-media/' prefix if present, then get public URL
    const filePath = item.file_url.startsWith('event-media/') 
      ? item.file_url.replace('event-media/', '') 
      : item.file_url;
    
    return supabase.storage.from('event-media').getPublicUrl(filePath).data.publicUrl;
  };

  const handleDownloadEntireAlbum = async () => {
    setDownloadingZip(true);
    try {
      toast({
        title: 'Preparing download...',
        description: 'Creating ZIP archive of all media',
      });

      const { data, error } = await supabase.functions.invoke('export-gallery-zip', {
        body: { 
          galleryId,
          scope: 'all'
        }
      });

      if (error) throw error;

      if (data?.download_url) {
        // Download the ZIP file
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = `${galleryTitle.replace(/[^a-z0-9]/gi, '_')}_complete.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Download started',
          description: 'Your album is being downloaded as a ZIP file',
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Could not create the album archive. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingZip(false);
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={scrollContainerRef}
        className="max-w-[90vw] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl flex flex-col gap-1">
            <span>{galleryTitle}</span>
            {eventDate && (
              <span className="text-lg font-normal text-primary">
                {formatEventDate(eventDate)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <>
          {/* Loading Album Overlay - Only on initial load */}
          {loading && isInitialLoad && (
            <div className="mb-6 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 shadow-soft animate-fade-in">
              <div className="flex items-center gap-6">
                {/* Circular Progress Loader */}
                <div className="relative flex-shrink-0">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                    {/* Background circle */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-gray-200"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="#6D28D9"
                      strokeWidth="4"
                      strokeDasharray={`${(loadProgress / 100) * 175.93} 175.93`}
                      strokeLinecap="round"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {loadProgress}%
                    </span>
                  </div>
                </div>
                
                {/* Loading Text */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Loading Album…
                  </h3>
                  <p className="text-sm text-primary font-medium">
                    {galleryTitle}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Content area with fade-in when loading completes */}
          <div className={`transition-opacity duration-700 ${loading && isInitialLoad ? 'opacity-0' : 'opacity-100'}`}>
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
                <Button
                  onClick={handleDownloadEntireAlbum}
                  variant="outline"
                  className="gap-2"
                  disabled={downloadingZip}
                >
                  {downloadingZip ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  Download Entire Album
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
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
                  {photos.map((photo, index) => (
                    <div 
                      key={photo.id} 
                      className="relative group cursor-pointer overflow-hidden rounded-sm aspect-square bg-black"
                      onDoubleClick={() => openLightbox(photos, index)}
                    >
                      <img
                        src={getImageUrl(photo)}
                        alt={photo.caption || 'Gallery photo'}
                        className="w-full h-full object-cover transition-all duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {/* Download Button - Bottom Left */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = getImageUrl(photo);
                              link.download = `photo-${photo.id}.jpg`;
                              link.click();
                            }}
                            className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
                            aria-label="Download photo"
                          >
                            <Download className="w-4 h-4 text-gray-800" />
                          </button>
                          
                          {/* Share Button - Bottom Right */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareGallery();
                            }}
                            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
                            aria-label="Share photo"
                          >
                            <Share2 className="w-4 h-4 text-gray-800" />
                          </button>
                        </div>
                      </div>
                    </div>
                   ))}
                  </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="mt-4 animate-fade-in">
              {videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No videos yet
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
                  {videos.map((video, index) => (
                    <div 
                      key={video.id} 
                      className="relative group cursor-pointer overflow-hidden rounded-sm aspect-video bg-black"
                      onDoubleClick={() => openLightbox(videos, index)}
                    >
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.caption || 'Video thumbnail'}
                          className="w-full h-full object-cover transition-all duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Play Icon - Bottom Right Corner */}
                      <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-5 h-5 text-gray-800 ml-0.5" />
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {/* Download Button - Bottom Left */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = video.thumbnail_url || '';
                              link.download = `video-${video.id}.mp4`;
                              link.click();
                            }}
                            className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors z-10"
                            aria-label="Download video"
                          >
                            <Download className="w-4 h-4 text-gray-800" />
                          </button>
                          
                          {/* Share Button - Bottom Right (pushed left to avoid play icon) */}
                          <button
                            onClick={(e) => {
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
                    </div>
                  ))}
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
