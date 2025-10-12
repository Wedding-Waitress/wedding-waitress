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
        setPhotos(data.filter((item: MediaItem) => item.post_type === 'photo'));
        setVideos(data.filter((item: MediaItem) => item.post_type === 'video'));
        setMessages(data.filter((item: MediaItem) => item.post_type === 'text'));
      }
    } catch (error) {
      console.error('Error fetching gallery content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (item: MediaItem) => {
    if (item.file_url && item.file_url.startsWith('event-media/')) {
      return supabase.storage.from('event-media').getPublicUrl(item.file_url.replace('event-media/', '')).data.publicUrl;
    }
    return item.file_url;
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
                          src={getImageUrl(photo)}
                          alt={photo.caption || 'Gallery photo'}
                          className="w-full h-full object-cover"
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
