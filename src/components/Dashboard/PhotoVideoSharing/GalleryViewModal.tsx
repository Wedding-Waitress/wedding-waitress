import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, MessageSquare, Loader2, Play, Download, Share2, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

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
  created_at: string;
  width?: number;
  height?: number;
  status?: string;
  displayUrl?: string;
  thumbnailDisplayUrl?: string;
  stream_preview_image?: string;
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
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && galleryId) {
      fetchGalleryContent();
    }
  }, [isOpen, galleryId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null);
      setLightboxIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === -1) return;
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
      if (e.key === 'Escape') setLightboxIndex(-1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos, videos]);

  const signStorageUrl = async (
    maybePath: string | null | undefined, 
    opts?: { transform?: { width?: number; quality?: number } }
  ): Promise<string | null> => {
    if (!maybePath) return null;
    if (/^https?:\/\//i.test(maybePath)) return maybePath;
    
    const path = maybePath.replace(/^event-media\//, '');
    const { data, error } = await supabase.storage
      .from('event-media')
      .createSignedUrl(path, 3600, opts);
    
    if (error) {
      console.error('createSignedUrl error', { path, error });
      return null;
    }
    return data?.signedUrl ?? null;
  };

  const fetchGalleryContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_uploads')
        .select('*')
        .eq('gallery_id', galleryId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const processedData = await Promise.all(
          data.map(async (item: MediaItem) => {
            let displayUrl: string | null | undefined = item.file_url;
            let thumbnailDisplayUrl: string | null | undefined = item.thumbnail_url;

            if (item.post_type === 'photo') {
              const thumb = await signStorageUrl(
                item.thumbnail_url || item.file_url, 
                { transform: { width: 800, quality: 75 } }
              );
              const full = await signStorageUrl(item.file_url);
              thumbnailDisplayUrl = thumb || full || undefined;
              displayUrl = full || undefined;
            }

            if (item.post_type === 'video' && !item.cloudflare_stream_uid && item.file_url) {
              displayUrl = await signStorageUrl(item.file_url);
            }

            return {
              ...item,
              displayUrl: displayUrl || undefined,
              thumbnailDisplayUrl: thumbnailDisplayUrl || displayUrl || undefined
            };
          })
        );

        setPhotos(processedData.filter((item: any) => item.post_type === 'photo'));
        setVideos(processedData.filter((item: any) => item.post_type === 'video'));
        setMessages(processedData.filter((item: any) => item.post_type === 'text'));
      }
    } catch (error) {
      console.error('Error fetching gallery content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedItems = useMemo(() => {
    return (items: MediaItem[]) => {
      return [...items].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
    };
  }, [sortOrder]);

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (items: MediaItem[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const navigateLightbox = (direction: number) => {
    const allMedia = [...photos, ...videos];
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < allMedia.length) {
      setLightboxIndex(newIndex);
      setSelectedItem(allMedia[newIndex]);
    }
  };

  const openLightbox = (item: MediaItem, items: MediaItem[]) => {
    const index = items.findIndex(i => i.id === item.id);
    setLightboxIndex(index);
    setSelectedItem(item);
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
    } else {
      navigator.clipboard.writeText(item.displayUrl || '');
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

  const MediaCard = ({ item, index, items, type }: { item: MediaItem; index: number; items: MediaItem[]; type: 'photo' | 'video' }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const isSelected = selectedItems.has(item.id);

    // Pre-decode images for smooth loading
    useEffect(() => {
      if (type === 'photo' && item.thumbnailDisplayUrl) {
        const img = document.createElement('img');
        img.src = item.thumbnailDisplayUrl || item.displayUrl || '';
        
        img.decode()
          .then(() => setImageLoaded(true))
          .catch(() => setImageLoaded(true));
          
        return () => {
          img.src = '';
        };
      }
    }, [item.thumbnailDisplayUrl, item.displayUrl, type]);

    // Pre-decode video posters
    useEffect(() => {
      if (type === 'video' && item.cloudflare_stream_uid) {
        const posterUrl = item.stream_preview_image || `https://customer-xvug97yzqxwnmtgg.cloudflarestream.com/${item.cloudflare_stream_uid}/thumbnails/thumbnail.jpg`;
        const img = document.createElement('img');
        img.src = posterUrl;
        
        img.decode()
          .then(() => setImageLoaded(true))
          .catch(() => setImageLoaded(true));
          
        return () => {
          img.src = '';
        };
      } else if (type === 'video') {
        setImageLoaded(true);
      }
    }, [item.cloudflare_stream_uid, item.stream_preview_image, type]);

    return (
      <div className="group relative">
        <div
          className="relative aspect-square rounded-lg overflow-hidden bg-white border border-[#E6E6E6] shadow-sm cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => openLightbox(item, items)}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-100" />
          )}
          
          {type === 'photo' && imageLoaded ? (
            <img
              src={item.thumbnailDisplayUrl || item.displayUrl}
              alt={`${galleryTitle} - Photo ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (item.displayUrl && target.src !== item.displayUrl) {
                  target.src = item.displayUrl;
                } else {
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.placeholder-icon')) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'placeholder-icon w-full h-full flex items-center justify-center text-muted-foreground text-4xl';
                    placeholder.textContent = '📷';
                    parent.appendChild(placeholder);
                  }
                }
              }}
            />
          ) : type === 'video' && item.cloudflare_stream_uid && imageLoaded ? (
            <div className="relative w-full h-full">
              <img
                src={item.stream_preview_image || `https://customer-xvug97yzqxwnmtgg.cloudflarestream.com/${item.cloudflare_stream_uid}/thumbnails/thumbnail.jpg`}
                alt={`${galleryTitle} - Video ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 rounded-full p-1.5">
                <Play className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : type === 'video' && item.displayUrl && imageLoaded ? (
            <>
              <video
                src={item.displayUrl}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 rounded-full p-1.5">
                <Play className="w-4 h-4 text-white" />
              </div>
            </>
          ) : type === 'video' && imageLoaded ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">🎥</span>
            </div>
          ) : null}

          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => {
              e.stopPropagation();
              toggleSelection(item.id);
            }}
          >
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'bg-white/90 border-white hover:border-primary'}`}>
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        </div>

        <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="truncate">{formatTimestamp(item.created_at)}</span>
          {item.caption && <span className="ml-1 truncate max-w-[60%]">{item.caption}</span>}
        </div>
      </div>
    );
  };

  const Toolbar = ({ items, type }: { items: MediaItem[]; type: string }) => {
    const sortedItems = getSortedItems(items);
    const allSelected = selectedItems.size === sortedItems.length && sortedItems.length > 0;

    return (
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {sortedItems.length} {type}{sortedItems.length !== 1 ? 's' : ''}
            {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSelectAll(sortedItems)}
            className="text-xs"
          >
            {allSelected ? 'Clear All' : 'Select All'}
          </Button>
        </div>

        <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{galleryTitle}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="photos" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
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
              </TabsList>

              <TabsContent value="photos" className="mt-4">
                {photos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No photos yet
                  </div>
                ) : (
                  <>
                    <Toolbar items={photos} type="Photo" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {getSortedItems(photos).map((photo, idx) => (
                        <MediaCard key={photo.id} item={photo} index={idx} items={getSortedItems(photos)} type="photo" />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="videos" className="mt-4">
                {videos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No videos yet
                  </div>
                ) : (
                  <>
                    <Toolbar items={videos} type="Video" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {getSortedItems(videos).map((video, idx) => (
                        <MediaCard key={video.id} item={video} index={idx} items={getSortedItems(videos)} type="video" />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="messages" className="mt-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <Card key={message.id}>
                        <CardContent className="p-4">
                          <p className="text-sm whitespace-pre-wrap">{message.text_content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(message.created_at).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Lightbox */}
      {selectedItem && lightboxIndex >= 0 && (
        <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setLightboxIndex(-1); }}>
          <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black/95 border-0">
            <div className="relative w-full h-full flex flex-col">
              {/* Top Actions Bar */}
              <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleShare(selectedItem)}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => { setSelectedItem(null); setLightboxIndex(-1); }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                {selectedItem.post_type === 'photo' ? (
                  <img
                    src={selectedItem.displayUrl}
                    alt={selectedItem.caption || `${galleryTitle} media`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : selectedItem.cloudflare_stream_uid ? (
                  <div className="w-full max-w-4xl aspect-video">
                    <iframe
                      src={`https://iframe.videodelivery.net/${selectedItem.cloudflare_stream_uid}`}
                      className="w-full h-full rounded-lg"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                    />
                  </div>
                ) : selectedItem.displayUrl ? (
                  <video
                    src={selectedItem.displayUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-lg"
                  />
                ) : null}
              </div>

              {/* Navigation Arrows */}
              {lightboxIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                  onClick={() => navigateLightbox(-1)}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
              )}
              {lightboxIndex < [...photos, ...videos].length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                  onClick={() => navigateLightbox(1)}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              )}

              {/* Bottom Caption Area */}
              {(selectedItem.caption || selectedItem.created_at) && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="max-w-4xl mx-auto text-white">
                    {selectedItem.caption && (
                      <p className="text-base mb-1">{selectedItem.caption}</p>
                    )}
                    <p className="text-sm text-white/70">
                      {formatTimestamp(selectedItem.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};