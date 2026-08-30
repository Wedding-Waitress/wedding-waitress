// Photo & Video Sharing Access — QR code + public upload link (feature workspace).
// Reuses the same meta/token/toggle logic as the original setup card; Live View
// controls intentionally live elsewhere (future Live Slideshow page).
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
}> = ({ meta, onToggleOpen, appearance = 'default' }) => {
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
    <Card className={cn('h-full p-5 sm:p-6 space-y-6 overflow-hidden', isGlass && managementStyles.glassCard)} data-appearance={isGlass ? appearance : undefined}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className={cn('text-xl flex items-center gap-2', isGlass ? 'font-semibold tracking-[-0.012em] leading-tight text-white' : 'font-bold')} style={isGlass ? undefined : { color: '#000000' }}>
            <QrCode className="h-5 w-5 text-[#967A59] shrink-0" /> Photo & Video Sharing Access
          </h2>
          <p className={cn('text-sm mt-1 break-words', isGlass && 'font-normal text-[#e8ddd2]')} style={isGlass ? undefined : { color: '#1a1a1a' }}>
            Share the QR code or link your guests use to share photos and videos.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Label htmlFor="open-toggle" className={cn('text-sm', isGlass && 'font-medium text-white')}>Accepting Guest Uploads</Label>
          <Switch id="open-toggle" checked={meta.is_open} onCheckedChange={onToggleOpen} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-6 items-start">
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Photo & Video Sharing QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" />
          ) : (
            <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border" />
          )}
        </div>
        <div className="space-y-4 min-w-0">
          {!meta.primary_token ? (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
              <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">Sharing link not ready — please retry.</p>
            </div>
          ) : (
            <div>
              <Label className={cn('text-sm', isGlass && 'font-medium text-white')}>Public sharing link</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Input value={guestUrl} readOnly className={cn('h-11 text-sm min-w-0 flex-1', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassField)} />
                <Button variant="outline" className={cn('lv-premium-shade h-11 shrink-0', isGlass && 'border-[#967A59]', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)} onClick={copy}>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className={cn('lv-premium-shade', isGlass && 'border-[#967A59]', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)}
              onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
              disabled={!guestUrl}
              title="Open the sharing page in a new tab"
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Open sharing page
            </Button>
            <Button variant="outline" className={cn('lv-premium-shade', isGlass && 'border-[#967A59]', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)} onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-1" /> Download QR code
            </Button>
          </div>
          <p className={cn('text-xs text-muted-foreground', isGlass && managementStyles.gallerySecondaryText)}>
            This link does not expire. Switch <strong>Accepting Guest Uploads</strong> off to stop new uploads.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default GalleryUploadAccessCard;
