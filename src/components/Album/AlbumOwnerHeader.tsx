import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, ImageIcon, Download, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeGenerator from 'qrcode';
import { buildGalleryUploadUrl } from '@/lib/urlUtils';

interface Event {
  id: string;
  name: string;
  slug: string;
  date: string | null;
}

interface AlbumOwnerHeaderProps {
  event: Event | null;
  allEvents: Event[];
  gallerySettings: { require_approval: boolean } | null;
  onEventChange: (eventId: string) => void;
  onToggleAutoApprove: () => void;
  onCopyUploadLink: () => void;
  onCopyGalleryLink: () => void;
  onDownloadAll: () => void;
  onPlaySlideshow: () => void;
  onShowQR: () => void;
  downloading: boolean;
}

export const AlbumOwnerHeader = ({
  event,
  allEvents,
  gallerySettings,
  onEventChange,
  onToggleAutoApprove,
  onCopyUploadLink,
  onCopyGalleryLink,
  onDownloadAll,
  onPlaySlideshow,
  onShowQR,
  downloading,
}: AlbumOwnerHeaderProps) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  useEffect(() => {
    if (event?.slug) {
      const uploadUrl = buildGalleryUploadUrl(event.slug);
      QRCodeGenerator.toDataURL(uploadUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).then(setQrDataUrl);
    }
  }, [event?.slug]);

  const handleDownloadQR = () => {
    if (!qrDataUrl || !event?.slug) return;
    
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}_upload_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'QR Code downloaded' });
  };

  if (!event) return null;

  const autoApproveOn = !gallerySettings?.require_approval;

  const sortedEvents = [...allEvents].sort((a, b) => 
    (b.date || '').localeCompare(a.date || '')
  );

  return (
    <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left Column: Event Selector + QR Code */}
          <div className="flex flex-col gap-3">
            {/* Event Selector */}
            <div>
              <Select value={event.id} onValueChange={onEventChange}>
                <SelectTrigger className="min-w-[250px] max-w-[400px] border-[#E0E0E0] focus:ring-primary">
                  <SelectValue placeholder="Select Event" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {sortedEvents.map((evt) => (
                    <SelectItem key={evt.id} value={evt.id}>
                      {evt.name} – {formatEventDate(evt.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">Select Event</p>
            </div>

            {/* QR Code Box */}
            <div className="bg-white border rounded-lg p-3 flex flex-col items-center gap-2" style={{ borderColor: '#EAEAEA' }}>
              <p className="text-xs font-semibold text-center" style={{ color: '#6D28D9' }}>Guest Upload QR</p>
              {event.slug && qrDataUrl ? (
                <>
                  <img src={qrDataUrl} alt="Upload QR Code" className="w-[120px] h-[120px]" />
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={handleDownloadQR}
                    className="text-xs h-7 px-2"
                    style={{ borderColor: '#6D28D9', color: '#6D28D9' }}
                  >
                    Download QR
                  </Button>
                </>
              ) : (
                <div className="w-[120px] h-[120px] flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                  QR will appear after first save.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="xs" onClick={onCopyUploadLink}>
              <Link className="w-4 h-4 mr-2" />
              Copy Upload Link
            </Button>
            <Button variant="outline" size="xs" onClick={onCopyGalleryLink}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Copy Gallery Link
            </Button>
            <Button variant="outline" size="xs" onClick={onDownloadAll} disabled={downloading}>
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Preparing...' : 'Download All'}
            </Button>
            <Button variant="default" size="xs" onClick={onPlaySlideshow}>
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
    </div>
  );
};
