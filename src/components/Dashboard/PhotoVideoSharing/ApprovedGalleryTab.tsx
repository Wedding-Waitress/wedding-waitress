import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Play, Pause } from 'lucide-react';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { useMediaGallerySettings } from '@/hooks/useMediaGallerySettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApprovedGalleryTabProps {
  eventId: string;
}

export const ApprovedGalleryTab: React.FC<ApprovedGalleryTabProps> = ({ eventId }) => {
  const { media, loading, refetch } = useMediaGallery(eventId);
  const { settings } = useMediaGallerySettings(eventId);
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const approvedMedia = media.filter(m => m.status === 'approved');

  // Slideshow logic
  React.useEffect(() => {
    if (!slideshowActive || approvedMedia.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % approvedMedia.length);
    }, (settings?.slideshow_interval_seconds || 5) * 1000);

    return () => clearInterval(interval);
  }, [slideshowActive, approvedMedia.length, settings]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const mediaItem = media.find(m => m.id === deleteId);
      if (!mediaItem) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('event-media')
        .remove([mediaItem.file_url]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_uploads')
        .delete()
        .eq('id', deleteId);

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Media deleted successfully',
      });

      refetch();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete media',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('event-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return <div className="text-center py-8">Loading gallery...</div>;
  }

  if (approvedMedia.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No approved media in gallery yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Slideshow Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {approvedMedia.length} {approvedMedia.length === 1 ? 'Item' : 'Items'}
        </h3>
        <Button
          variant="outline"
          onClick={() => setSlideshowActive(!slideshowActive)}
        >
          {slideshowActive ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Stop Slideshow
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Slideshow
            </>
          )}
        </Button>
      </div>

      {/* Gallery Grid */}
      {!slideshowActive ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {approvedMedia.map((item) => (
            <Card key={item.id} className="overflow-hidden group relative">
              <div className="aspect-square bg-muted">
                {item.type === 'image' ? (
                  <img
                    src={getMediaUrl(item.file_url)}
                    alt={item.caption || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={getMediaUrl(item.file_url)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteId(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Slideshow View */
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {approvedMedia[currentSlideIndex]?.type === 'image' ? (
            <img
              src={getMediaUrl(approvedMedia[currentSlideIndex].file_url)}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              src={getMediaUrl(approvedMedia[currentSlideIndex].file_url)}
              className="w-full h-full object-contain"
              autoPlay
              muted
            />
          )}
          {settings?.show_captions && approvedMedia[currentSlideIndex]?.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-center">
              {approvedMedia[currentSlideIndex].caption}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this media item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};