import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Eye } from 'lucide-react';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

interface PendingUploadsTabProps {
  eventId: string;
}

export const PendingUploadsTab: React.FC<PendingUploadsTabProps> = ({ eventId }) => {
  const { media, loading, refetch } = useMediaGallery(eventId);
  const { toast } = useToast();
  
  const pendingMedia = media.filter(m => m.status === 'pending');

  const handleModerate = async (mediaId: string, action: 'approve' | 'reject') => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-media', {
        body: { media_id: mediaId, action },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Media ${action}d successfully`,
      });

      refetch();
    } catch (error: any) {
      console.error('Moderation error:', error);
      toast({
        title: 'Error',
        description: `Failed to ${action} media`,
        variant: 'destructive',
      });
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('event-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending uploads...</div>;
  }

  if (pendingMedia.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No pending uploads to review</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pendingMedia.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <div className="aspect-square relative bg-muted">
            {item.type === 'image' ? (
              <img
                src={getMediaUrl(item.file_url)}
                alt={item.caption || 'Uploaded media'}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={getMediaUrl(item.file_url)}
                className="w-full h-full object-cover"
                controls
              />
            )}
          </div>
          <div className="p-4">
            {item.caption && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {item.caption}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => handleModerate(item.id, 'approve')}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => handleModerate(item.id, 'reject')}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};