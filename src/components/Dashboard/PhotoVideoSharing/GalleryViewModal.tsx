import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, MessageSquare, Loader2, Phone, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MediaLightbox } from '@/components/MediaLightbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GalleryViewModalProps {
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

export const GalleryViewModal: React.FC<GalleryViewModalProps> = ({
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
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && galleryId) {
      fetchGalleryContent();
    }
  }, [isOpen, galleryId]);

  const fetchGalleryContent = async () => {
    setLoading(true);
    try {
      // Fetch media uploads
      const { data, error } = await supabase
        .from('media_uploads')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPhotos(data.filter((item: MediaItem) => 
          item.mime_type?.startsWith('image/') || item.post_type === 'photo'
        ));
        setVideos(data.filter((item: MediaItem) => 
          item.mime_type?.startsWith('video/') || item.post_type === 'video'
        ));
        setMessages(data.filter((item: MediaItem) => item.post_type === 'text'));
      }

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
    } catch (error) {
      console.error('Error fetching gallery content:', error);
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

  const openLightbox = (items: MediaItem[], index: number) => {
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{galleryTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
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

            <TabsContent value="photos" className="mt-4">
              {photos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No photos yet
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={photo.id} className="cursor-pointer" onClick={() => openLightbox(photos, index)}>
                        <div className="aspect-square relative border-2 border-primary rounded-none overflow-hidden bg-black hover:border-primary-glow transition-colors">
                          <img
                            src={getImageUrl(photo)}
                            alt={photo.caption || 'Gallery photo'}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground mt-1 px-1">
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="mt-4">
              {videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No videos yet
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {videos.map((video, index) => (
                      <div key={video.id} className="cursor-pointer" onClick={() => openLightbox(videos, index)}>
                        <div className="aspect-video border-2 border-primary rounded-none overflow-hidden bg-black hover:border-primary-glow transition-colors relative group">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.caption || 'Video thumbnail'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Video className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <div className="w-0 h-0 border-l-[12px] border-l-primary border-y-[8px] border-y-transparent ml-1" />
                            </div>
                          </div>
                        </div>
                        {video.caption && (
                          <p className="text-sm text-muted-foreground mt-1 px-1">
                            {video.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
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

            <TabsContent value="audio" className="mt-4">
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
        )}
      </DialogContent>

      {/* Media Lightbox */}
      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        onShareGallery={handleShareGallery}
      />
    </Dialog>
  );
};
