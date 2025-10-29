import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link, ImageIcon, Download, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AlbumOwnerHeaderProps {
  event: { id: string; name: string; slug: string } | null;
  gallerySettings: { require_approval: boolean } | null;
  onToggleAutoApprove: () => void;
  onCopyUploadLink: () => void;
  onCopyGalleryLink: () => void;
  onDownloadAll: () => void;
  onPlaySlideshow: () => void;
  downloading: boolean;
}

export const AlbumOwnerHeader = ({
  event,
  gallerySettings,
  onToggleAutoApprove,
  onCopyUploadLink,
  onCopyGalleryLink,
  onDownloadAll,
  onPlaySlideshow,
  downloading,
}: AlbumOwnerHeaderProps) => {
  if (!event) return null;

  const autoApproveOn = !gallerySettings?.require_approval;

  return (
    <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Event Title */}
        <div>
          <h1 className="text-xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">Album Manager</p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCopyUploadLink}>
            <Link className="w-4 h-4 mr-2" />
            Copy Upload Link
          </Button>
          <Button variant="outline" size="sm" onClick={onCopyGalleryLink}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Copy Gallery Link
          </Button>
          <Button variant="outline" size="sm" onClick={onDownloadAll} disabled={downloading}>
            <Download className="w-4 h-4 mr-2" />
            {downloading ? 'Preparing...' : 'Download All'}
          </Button>
          <Button variant="default" size="sm" onClick={onPlaySlideshow}>
            <Play className="w-4 h-4 mr-2" />
            Slideshow
          </Button>

          {/* Auto-approve pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
            <span className="text-xs font-medium">Auto-approve:</span>
            <Switch 
              checked={autoApproveOn} 
              onCheckedChange={onToggleAutoApprove}
              className="data-[state=checked]:bg-success"
            />
            <span className={`text-xs font-bold ${autoApproveOn ? 'text-success' : 'text-muted-foreground'}`}>
              {autoApproveOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
