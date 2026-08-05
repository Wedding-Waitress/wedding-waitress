// Live Slideshow Access — reuses the existing event gallery token and Live View slideshow route.
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Download, QrCode, TriangleAlert, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGallerySlideshowUrl, buildGalleryGuestAppUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

// Admin-only venue display URL (Launch Live Slideshow).
export function buildLiveSlideshowUrl(token: string | null): string {
  return token ? buildGallerySlideshowUrl(token) : '';
}

export const GallerySlideshowAccessCard: React.FC<{ meta: GalleryMeta }> = ({ meta }) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  // Guest-facing QR / link is always the canonical unified guest app URL.
  const url = buildGalleryGuestAppUrl(meta.primary_token);
  const slideshowUrl = buildLiveSlideshowUrl(meta.primary_token);

  useEffect(() => {
    if (!url) { setQrDataUrl(''); return; }
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [url]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Live View link copied' });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'live-slideshow-qr.png';
    a.click();
  };

  const launch = () => { if (slideshowUrl) window.open(slideshowUrl, '_blank', 'noopener,noreferrer'); };

  return (
    <Card className="h-full p-5 sm:p-6 space-y-6 overflow-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <QrCode size={22} strokeWidth={1.8} className="text-[#967A59] shrink-0" /> Live Slideshow Access
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Open this Live View link on any television, monitor or projector at your venue.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-6 items-start">
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Live Slideshow QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" />
          ) : (
            <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border" />
          )}
        </div>

        <div className="space-y-4 min-w-0">
          {!meta.primary_token ? (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
              <TriangleAlert size={18} strokeWidth={1.8} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">Live View link not ready — please retry.</p>
            </div>
          ) : (
            <div>
              <Label className="text-sm">Live View link</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Input value={url} readOnly className="h-11 text-sm min-w-0 flex-1" />
                <Button variant="outline" className="lv-premium-shade h-11 shrink-0" onClick={copy}>
                  <Copy size={16} strokeWidth={1.8} className="mr-1.5" /> Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="lv-premium-shade" onClick={launch} disabled={!slideshowUrl}>
              <ExternalLink size={16} strokeWidth={1.8} className="mr-1.5" /> Launch Live Slideshow
            </Button>
            <Button variant="outline" className="lv-premium-shade" onClick={downloadQr} disabled={!qrDataUrl}>
              <Download size={16} strokeWidth={1.8} className="mr-1.5" /> Download QR code
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Uses your existing event gallery token — approved, visible media only.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default GallerySlideshowAccessCard;
