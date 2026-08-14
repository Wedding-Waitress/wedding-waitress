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
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

// Admin-only venue display URL (Launch Live Slideshow).
export function buildLiveSlideshowUrl(token: string | null): string {
  return token ? buildGallerySlideshowUrl(token) : '';
}

export const GallerySlideshowAccessCard: React.FC<{ meta: GalleryMeta; appearance?: 'default' | 'espresso-glass' }> = ({ meta, appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
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
    <Card className={cn('h-full p-5 sm:p-6 space-y-6 overflow-hidden', isGlass && managementStyles.glassCard)} data-appearance={isGlass ? appearance : undefined}>
      <div className="min-w-0">
        <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
          <QrCode size={22} strokeWidth={1.8} className={cn('text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} /> Live Slideshow Access
        </h2>
        <p className={cn('text-sm mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)} style={isGlass ? undefined : { color: '#1a1a1a' }}>
          Open this Live View link on any television, monitor or projector at your venue.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-6 items-start">
        <div className="flex justify-center">
          <div className={cn(isGlass && managementStyles.galleryViewQrFrame)}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Live Slideshow QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border bg-white" />
            )}
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {!meta.primary_token ? (
            <div className={cn('flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5', isGlass && managementStyles.guestbookStatePanel)}>
              <TriangleAlert size={18} strokeWidth={1.8} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">Live View link not ready — please retry.</p>
            </div>
          ) : (
            <div>
              <Label className={cn('text-sm', isGlass && managementStyles.galleryViewHeading)}>Live View link</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Input value={url} readOnly className={cn('h-11 text-sm min-w-0 flex-1', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassField)} />
                <Button variant="outline" className={cn('lv-premium-shade h-11 shrink-0', isGlass && managementStyles.galleryControl)} onClick={copy}>
                  <Copy size={16} strokeWidth={1.8} className="mr-1.5" /> Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)} onClick={launch} disabled={!slideshowUrl}>
              <ExternalLink size={16} strokeWidth={1.8} className="mr-1.5" /> Launch Live Slideshow
            </Button>
            <Button variant="outline" className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)} onClick={downloadQr} disabled={!qrDataUrl}>
              <Download size={16} strokeWidth={1.8} className="mr-1.5" /> Download QR code
            </Button>
          </div>

          <p className={cn('text-xs text-muted-foreground', isGlass && managementStyles.gallerySecondaryText)}>
            Uses your existing event gallery token — approved, visible media only.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default GallerySlideshowAccessCard;
