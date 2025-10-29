import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MediaItem {
  id: string;
  event_id: string;
  type: 'photo' | 'video' | 'audio';
  storage_path: string | null;
  thumbnail_path: string | null;
  cloudflare_stream_uid: string | null;
  status: string;
  visibility: 'public' | 'hidden';
  caption: string | null;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  filesize: number | null;
  sort_index: number | null;
  created_at: string;
}

export const useAlbumMedia = (eventId: string | null) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMedia = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_index', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedia((data || []) as MediaItem[]);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: 'Error',
        description: 'Failed to load media items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();

    if (!eventId) return;

    // Real-time subscription
    const subscription = supabase
      .channel(`album-media:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'media_items',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMedia(prev => [payload.new as MediaItem, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setMedia(prev => prev.map(item => 
            item.id === payload.new.id ? payload.new as MediaItem : item
          ));
        } else if (payload.eventType === 'DELETE') {
          setMedia(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  const updateVisibility = async (id: string, visibility: 'public' | 'hidden') => {
    try {
      const { error } = await supabase
        .from('media_items')
        .update({ visibility })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Media ${visibility === 'public' ? 'shown' : 'hidden'}`,
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update visibility',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateCaption = async (id: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('media_items')
        .update({ caption })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Caption updated',
      });
    } catch (error) {
      console.error('Error updating caption:', error);
      toast({
        title: 'Error',
        description: 'Failed to update caption',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteMedia = async (id: string) => {
    try {
      const item = media.find(m => m.id === id);
      if (!item) return;

      // Delete from storage
      if (item.storage_path) {
        const bucket = item.type === 'photo' ? 'media-photos' : 
                       item.type === 'video' ? 'media-videos' : 'media-audio';
        await supabase.storage.from(bucket).remove([item.storage_path]);
      }

      // Delete thumbnail
      if (item.thumbnail_path) {
        await supabase.storage.from('media-thumbs').remove([item.thumbnail_path]);
      }

      // Delete DB record
      const { error } = await supabase
        .from('media_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Media deleted permanently',
      });
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete media',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return { 
    media, 
    loading, 
    refetch: fetchMedia, 
    updateVisibility,
    updateCaption,
    deleteMedia 
  };
};
