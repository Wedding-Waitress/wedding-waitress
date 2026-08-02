import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, Download, ExternalLink, MonitorPlay } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGallerySlideshowUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

export const GallerySlideshowCard: React.FC<{
  meta: GalleryMeta;
  onToggle: (enabled: boolean) => Promise<void>;
}> = ({ meta, onToggle }) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const enabled = !!meta.slideshow_enabled;
  const url = meta.primary_token ? buildGallerySlideshowUrl(meta.primary_token) : '';

  useEffect(() => {
    if (!url || !enabled) { setQrDataUrl(''); return; }
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [url, enabled]);

  const handleToggle = async (next: boolean) => {
    try {
      await onToggle(next);
      toast({ title: next ? 'Live Slideshow enabled' : 'Live Slideshow disabled' });
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message, variant: 'destructive' });
    }
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Slideshow link copied' });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'live-slideshow-qr.png';
    a.click();
  };

  return (
    <Card className="p-4 sm:p-5 space-y-4 overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#967A59]/10 flex items-center justify-center shrink-0">
            <MonitorPlay className="h-5 w-5 text-[#967A59]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-black" style={{ color: '#000000' }}>Live Slideshow</h2>
            <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
              Fullscreen auto-advancing slideshow of approved photos and videos — perfect for a TV or projector at the venue.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Label htmlFor="slideshow-toggle" className="text-sm">Enabled</Label>
          <Switch id="slideshow-toggle" checked={enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {enabled && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 grid grid-cols-1 md:grid-cols-[176px_1fr] gap-4 items-start">
          <div className="flex justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Live Slideshow QR code" className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg border border-border bg-white" />
            ) : (
              <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg border border-dashed border-border" />
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-[#6E6E73]">Live Slideshow link</Label>
              <p className="text-sm break-all mt-1 text-[#1D1D1F]">{url || '—'}</p>
              <p className="text-xs text-[#6E6E73] mt-1">
                Approved items only. New uploads appear automatically — hidden items never show.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="lv-premium-shade"
                variant="outline"
                size="sm"
                onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
                disabled={!url}
              >
                <ExternalLink className="h-4 w-4 mr-1" /> Open Slideshow
              </Button>
              <Button className="lv-premium-shade" variant="outline" size="sm" onClick={copy} disabled={!url}>
                <Copy className="h-4 w-4 mr-1" /> Copy link
              </Button>
              <Button className="lv-premium-shade" variant="outline" size="sm" onClick={downloadQr} disabled={!qrDataUrl}>
                <Download className="h-4 w-4 mr-1" /> Download QR code
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GallerySlideshowCard;
