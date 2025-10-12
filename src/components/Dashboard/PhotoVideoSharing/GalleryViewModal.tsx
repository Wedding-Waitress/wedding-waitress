import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    if (isOpen && galleryId) {
      fetchGalleryContent();
    }
  }, [isOpen, galleryId]);

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
        // Process media items to generate signed URLs for private storage
        const processedData = await Promise.all(
          data.map(async (item: MediaItem) => {
            let displayUrl: string | null | undefined = item.file_url;
            let thumbnailDisplayUrl: string | null | undefined = item.thumbnail_url;

            // For photos, generate signed URLs with transformation
            if (item.post_type === 'photo') {
              const thumb = await signStorageUrl(
                item.thumbnail_url || item.file_url, 
                { transform: { width: 800, quality: 75 } }
              );
              const full = await signStorageUrl(item.file_url);
              thumbnailDisplayUrl = thumb || full || undefined;
              displayUrl = full || undefined;
            }

            // For direct video uploads (non-Cloudflare Stream)
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <Card key={photo.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={(photo as any).thumbnailDisplayUrl || (photo as any).displayUrl}
                          alt={photo.caption || 'Gallery photo'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if ((photo as any).displayUrl && target.src !== (photo as any).displayUrl) {
                              target.src = (photo as any).displayUrl;
                            } else {
                              console.error('Image failed to load', { id: photo.id, srcTried: target.src });
                              target.style.visibility = 'hidden';
                            }
                          }}
                        />
                      </div>
                      {photo.caption && (
                        <CardContent className="p-2">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {photo.caption}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="videos" className="mt-4">
              {videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No videos yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      {video.cloudflare_stream_uid ? (
                        <div className="aspect-video">
                          <iframe
                            src={`https://iframe.videodelivery.net/${video.cloudflare_stream_uid}`}
                            className="w-full h-full"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      {video.caption && (
                        <CardContent className="p-3">
                          <p className="text-sm text-muted-foreground">
                            {video.caption}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
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
  );
};
