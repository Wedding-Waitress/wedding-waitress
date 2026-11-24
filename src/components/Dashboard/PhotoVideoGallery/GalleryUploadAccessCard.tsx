// Photo & Video Sharing Access — QR code + public upload link (feature workspace).
// Reuses the same meta/token/toggle logic as the original setup card; Live View
// controls intentionally live elsewhere (future Live Slideshow page).
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Download, QrCode, TriangleAlert, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryUploadUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

export const GalleryUploadAccessCard: React.FC<{
  meta: GalleryMeta;
  onToggleOpen: (open: boolean) => void;
  appearance?: 'default' | 'espresso-glass';
}> = ({ meta, appearance = 'default' }) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const guestUrl = meta.primary_token ? buildGalleryUploadUrl(meta.primary_token) : '';
  const isGlass = appearance === 'espresso-glass';

  useEffect(() => {
    if (!guestUrl) return;
    QRCode.toDataURL(guestUrl, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [guestUrl]);

  const copy = async () => {
    await navigator.clipboard.writeText(guestUrl);
    toast({ title: 'Link copied' });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'photo-video-gallery-qr.png';
    a.click();
  };

  return (
    <Card className={cn('h-full p-5 sm:p-6 space-y-6 overflow-hidden', isGlass && managementStyles.glassCard)} style={{containerType:'inline-size'}} data-appearance={isGlass ? appearance : undefined}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className={cn('text-xl flex items-center gap-2', isGlass ? 'font-semibold tracking-[-0.012em] leading-tight text-white' : 'font-bold')} style={isGlass ? undefined : { color: '#000000' }}>
            <QrCode className="h-5 w-5 text-[#967A59] shrink-0" /> Photo & Video Sharing Access
          </h2>
          <p className={cn('text-sm mt-1 break-words', isGlass && ['font-normal text-[#e8ddd2]', managementStyles.sharingHeadingDescription])} style={isGlass ? undefined : { color: '#1a1a1a' }}>
            Share this QR code or link for guest photo and video uploads.
          </p>
        </div>
      </div>

      <div className={managementStyles.sharingAccessLayout}>
        <div className={managementStyles.sharingAccessQr}>
          {qrDataUrl ? (
            <div className={cn(isGlass && managementStyles.galleryViewQrFrame)}><img src={qrDataUrl} alt="Photo & Video Sharing QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" /></div>
          ) : (
            <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border" />
          )}
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          {!meta.primary_token ? (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
              <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">Sharing link not ready — please retry.</p>
            </div>
          ) : (
            <div>
              <Label className={cn('text-sm', isGlass && 'font-medium text-white')}>Public sharing link</Label>
              <div className="mt-1.5">
                <Input value={guestUrl} readOnly className={cn('h-11 w-full text-sm min-w-0', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassField)} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="outline" className={cn('lv-premium-shade h-auto min-h-11 w-full whitespace-normal', isGlass && 'border-[#967A59]', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)} onClick={copy} disabled={!guestUrl}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <Button
              variant="outline"
              className={cn('lv-premium-shade h-auto min-h-11 w-full whitespace-normal', isGlass && 'border-[#967A59]', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)}
              onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
              disabled={!guestUrl}
              title="Open the sharing page in a new tab"
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Open sharing page
            </Button>
            <Button variant="outline" className={cn('lv-premium-shade h-auto min-h-11 w-full whitespace-normal', isGlass && 'border-[#967A59]', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)} onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-1" /> Download QR code
            </Button>
          </div>

        </div>
      </div>
    </Card>
  );
};

export default GalleryUploadAccessCard;
