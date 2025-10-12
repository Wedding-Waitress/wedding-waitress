import React, { useState, useEffect, useRef } from 'react';
import { Download, Share2, ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getThemeById } from '@/lib/mediaConstants';

interface GalleryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  galleryTitle: string;
}

interface MediaItem {
  id: string;
  post_type: string;
  file_url?: string;
  thumbnail_url?: string;
  cloudflare_stream_uid?: string;
  caption?: string;
  text_content?: string;
  theme_id?: string;
  created_at: string;
  width?: number;
  height?: number;
  status?: string;
  displayUrl?: string;
  thumbnailDisplayUrl?: string;
  thumb512Url?: string;
  thumb1280Url?: string;
  poster_url?: string;
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
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && galleryId) {
      fetchGalleryContent();
    }
  }, [isOpen, galleryId]);

  const signStorageUrl = async (path: string, opts?: any) => {
    const { data } = await supabase.storage
      .from('event-media')
      .createSignedUrl(path, 86400, opts); // 24 hour cache
    return data?.signedUrl || '';
  };

  const fetchGalleryContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_uploads' as any)
        .select('*')
        .eq('gallery_id', galleryId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedItems = await Promise.all(
        (data as any[]).map(async (item) => {
          let displayUrl = '';
          let thumbnailDisplayUrl = '';
          let thumb512Url = '';
          let thumb1280Url = '';

          if (item.post_type === 'photo' && item.file_url) {
            // Generate responsive image URLs
            [thumb512Url, thumb1280Url, displayUrl] = await Promise.all([
              signStorageUrl(item.file_url, { transform: { width: 512, quality: 80 } }),
              signStorageUrl(item.file_url, { transform: { width: 1280, quality: 85 } }),
              signStorageUrl(item.file_url),
            ]);
            thumbnailDisplayUrl = thumb512Url;
          } else if (item.post_type === 'video' && item.cloudflare_stream_uid) {
            displayUrl = `https://customer-xvug97yzqxwnmtgg.cloudflarestream.com/${item.cloudflare_stream_uid}/iframe`;
            thumbnailDisplayUrl = item.poster_url || 
              `https://customer-xvug97yzqxwnmtgg.cloudflarestream.com/${item.cloudflare_stream_uid}/thumbnails/thumbnail.jpg?width=512&height=512&fit=crop`;
          }

          return {
            ...item,
            displayUrl,
            thumbnailDisplayUrl,
            thumb512Url,
            thumb1280Url,
          };
        })
      );

      setPhotos(processedItems.filter((item) => item.post_type === 'photo'));
      setVideos(processedItems.filter((item) => item.post_type === 'video'));
      setMessages(processedItems.filter((item) => item.post_type === 'text'));
    } catch (error: any) {
      console.error('Error fetching gallery:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gallery',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSortedItems = (items: MediaItem[]) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (lightboxIndex === null || !selectedItem) return;
    
    const items = getSortedItems(
      selectedItem.post_type === 'photo' ? photos :
      selectedItem.post_type === 'video' ? videos : messages
    );
    
    const newIndex = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1;
    if (newIndex >= 0 && newIndex < items.length) {
      setLightboxIndex(newIndex);
      setSelectedItem(items[newIndex]);
    }
  };

  const openLightbox = (index: number, type: 'photo' | 'video' | 'message') => {
    const items = getSortedItems(
      type === 'photo' ? photos : type === 'video' ? videos : messages
    );
    setLightboxIndex(index);
    setSelectedItem(items[index]);
  };

  const handleDownload = async (item: MediaItem) => {
    if (!item.displayUrl) return;
    try {
      const response = await fetch(item.displayUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${galleryTitle}-${item.id}.${item.post_type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Download started' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  const handleShare = async (item: MediaItem) => {
    if (navigator.share && item.displayUrl) {
      try {
        await navigator.share({
          title: item.caption || galleryTitle,
          url: item.displayUrl,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else if (item.displayUrl) {
      navigator.clipboard.writeText(item.displayUrl);
      toast({ title: 'Link copied to clipboard' });
    }
  };

  const formatTimestamp = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const MediaCard = ({ item, index, type }: { item: MediaItem; index: number; type: 'photo' | 'video' | 'message' }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Pre-decode images to prevent flicker
    useEffect(() => {
      if (!item.thumbnailDisplayUrl || type === 'message') return;
      
      const img = new Image();
      img.src = item.thumbnailDisplayUrl;
      img.decode()
        .then(() => {
          if (imgRef.current) {
            imgRef.current.src = item.thumbnailDisplayUrl;
            setImageLoaded(true);
          }
        })
        .catch(() => setImageLoaded(true));
    }, [item.thumbnailDisplayUrl, type]);

    return (
      <Card 
        key={item.id} 
        className="relative overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => openLightbox(index, type)}
      >
        <CardContent className="p-0 aspect-square relative">
          {!imageLoaded && type !== 'message' && <Skeleton className="absolute inset-0 bg-gray-100" />}
          
          {type === 'photo' ? (
            <img
              ref={imgRef}
              srcSet={item.thumb512Url && item.thumb1280Url ? 
                `${item.thumb512Url} 512w, ${item.thumb1280Url} 1280w` : 
                undefined
              }
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 90vw"
              src={item.thumbnailDisplayUrl}
              alt={`${galleryTitle} - Photo ${index + 1}`}
              className={`w-full h-full object-cover rounded-lg transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ imageRendering: 'auto' }}
              onLoad={() => setImageLoaded(true)}
            />
          ) : type === 'video' ? (
            <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
              <img
                ref={imgRef}
                src={item.thumbnailDisplayUrl}
                alt={`${galleryTitle} - Video ${index + 1}`}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'auto' }}
                onLoad={() => setImageLoaded(true)}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                  <Play className="h-8 w-8 text-white" fill="white" />
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="w-full h-full p-6 flex items-center justify-center text-center rounded-lg"
              style={{ 
                backgroundColor: item.theme_id ? getThemeById(item.theme_id)?.bgColor : '#f3f4f6',
              }}
            >
              <p className="text-lg font-medium line-clamp-6 whitespace-pre-wrap break-words">
                {item.text_content}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const Toolbar = ({ items, type }: { items: MediaItem[]; type: string }) => (
    <div className="flex items-center justify-end mb-4 px-1 gap-2">
      <span className="text-sm text-muted-foreground">
        {items.length} {type}
      </span>
      <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">{galleryTitle}</h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Tabs defaultValue="photos" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
                  <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
                  <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="photos" className="mt-4">
                  {photos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No photos yet</div>
                  ) : (
                    <>
                      <Toolbar items={photos} type="photo" />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {getSortedItems(photos).map((photo, idx) => (
                          <MediaCard key={photo.id} item={photo} index={idx} type="photo" />
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="videos" className="mt-4">
                  {videos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No videos yet</div>
                  ) : (
                    <>
                      <Toolbar items={videos} type="video" />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {getSortedItems(videos).map((video, idx) => (
                          <MediaCard key={video.id} item={video} index={idx} type="video" />
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="messages" className="mt-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No messages yet</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getSortedItems(messages).map((msg, idx) => (
                        <MediaCard key={msg.id} item={msg} index={idx} type="message" />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Lightbox */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-screen-lg w-full h-[90vh] p-0">
            <div className="relative w-full h-full flex flex-col bg-black">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
                <div className="flex-1">
                  {selectedItem.caption && (
                    <p className="text-white text-sm line-clamp-2">{selectedItem.caption}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(selectedItem)}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleShare(selectedItem)}
                    className="text-white hover:bg-white/20"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                      <X className="h-5 w-5" />
                    </Button>
                  </DialogClose>
                </div>
              </div>

              {/* Media Content */}
              <div className="flex-1 flex items-center justify-center p-16">
                {selectedItem.post_type === 'photo' ? (
                  <img
                    src={selectedItem.thumb1280Url || selectedItem.displayUrl}
                    alt={selectedItem.caption || 'Photo'}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    style={{ imageRendering: 'auto' }}
                    onLoad={(e) => {
                      // Preload full resolution in background
                      if (selectedItem.displayUrl && selectedItem.thumb1280Url) {
                        const highRes = new Image();
                        highRes.src = selectedItem.displayUrl;
                        highRes.onload = () => {
                          (e.target as HTMLImageElement).src = selectedItem.displayUrl;
                        };
                      }
                    }}
                  />
                ) : selectedItem.post_type === 'video' ? (
                  <iframe
                    src={selectedItem.displayUrl}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />
                ) : null}
              </div>

              {/* Navigation arrows */}
              {lightboxIndex !== null && (
                <>
                  {lightboxIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateLightbox('prev');
                      }}
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                  )}
                  {lightboxIndex < getSortedItems(
                    selectedItem.post_type === 'photo' ? photos :
                    selectedItem.post_type === 'video' ? videos : messages
                  ).length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateLightbox('next');
                      }}
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="text-white text-sm flex items-center justify-between">
                  <span>
                    {lightboxIndex !== null && `${lightboxIndex + 1} of ${
                      getSortedItems(
                        selectedItem.post_type === 'photo' ? photos :
                        selectedItem.post_type === 'video' ? videos : messages
                      ).length
                    }`}
                  </span>
                  {selectedItem.created_at && (
                    <span className="text-xs text-white/70">
                      {formatTimestamp(selectedItem.created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
