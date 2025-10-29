import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Eye, EyeOff, Download, Trash } from 'lucide-react';
import { useAlbumMedia } from '@/hooks/useAlbumMedia';
import { downloadMediaAsZip } from '@/lib/albumZipDownloader';

interface AlbumVoiceTabProps {
  eventId: string;
  eventName: string;
}

export const AlbumVoiceTab = ({ eventId, eventName }: AlbumVoiceTabProps) => {
  const { media, updateVisibility, deleteMedia } = useAlbumMedia(eventId);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioItems = media.filter(m => m.type === 'audio');

  const playAudio = (item: typeof audioItems[0]) => {
    if (item.storage_path && audioRef.current) {
      const { data } = supabase.storage.from('media-audio').getPublicUrl(item.storage_path);
      audioRef.current.src = data.publicUrl;
      audioRef.current.play();
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  const downloadAudio = async (item: typeof audioItems[0]) => {
    await downloadMediaAsZip([item], eventName);
  };

  if (audioItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-4">Voice Messages</h2>
        <div className="text-center py-12 text-muted-foreground">
          No voice messages yet
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Voice Messages</h2>

      <div className="space-y-3">
        {audioItems.map(item => (
          <Card key={item.id} className={item.visibility === 'hidden' ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Play Button */}
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => playAudio(item)}
                >
                  <Play className="w-4 h-4" />
                </Button>

                {/* Audio Info */}
                <div className="flex-1">
                  <p className="font-medium">{item.caption || 'Voice Message'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(item.duration_sec)} • {formatFileSize(item.filesize)}
                  </p>
                </div>

                {/* Status Badge */}
                {item.visibility === 'hidden' && (
                  <Badge variant="secondary">Hidden</Badge>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => updateVisibility(item.id, item.visibility === 'public' ? 'hidden' : 'public')}
                  >
                    {item.visibility === 'hidden' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => downloadAudio(item)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      if (confirm('Permanently delete this audio?')) {
                        deleteMedia(item.id);
                      }
                    }}
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hidden Audio Player */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};
