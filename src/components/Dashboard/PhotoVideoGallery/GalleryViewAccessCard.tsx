// Guest Gallery Access — public link + QR code to the unified guest app.
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Images, TriangleAlert, ExternalLink, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

interface Props {
  meta: GalleryMeta;
  guestUrl: string;
  appearance?: 'default' | 'espresso-glass';
}

export const GalleryViewAccessCard: React.FC<Props> = ({ meta, guestUrl, appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!guestUrl) { setQrDataUrl(''); return; }
    QRCode.toDataURL(guestUrl, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [guestUrl]);

  const copy = async () => {
    if (!guestUrl) return;
    await navigator.clipboard.writeText(guestUrl);
    toast({ title: 'Gallery link copied' });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'gallery-qr.png';
    a.click();
  };

  return (
    <Card className={cn('h-full p-5 sm:p-6 space-y-5 overflow-hidden', isGlass && managementStyles.glassCard)} data-appearance={isGlass ? appearance : undefined}>
      <div className="min-w-0">
        <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
          <Images className={cn('h-5 w-5 text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} strokeWidth={1.8} /> Guest Gallery Access
        </h2>
        <p className={cn('text-sm mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)} style={isGlass ? undefined : { color: '#1a1a1a' }}>
          Share this link so guests can browse the photos and videos from your event.
        </p>
      </div>

      {!meta.primary_token ? (
        <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
          <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" strokeWidth={1.8} />
          <p className="text-sm text-destructive">Gallery link not ready — please retry.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className={cn(isGlass && managementStyles.galleryViewQrFrame)}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Guest gallery QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" />
              ) : (
                <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border" />
              )}
            </div>
          </div>

          <Label className={cn('text-sm', isGlass && managementStyles.galleryViewHeading)}>Public gallery link</Label>
          <Input value={guestUrl} readOnly className={cn('h-11 text-sm w-full', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassField)} />
          <Button variant="outline" className={cn('lv-premium-shade h-11 w-full', isGlass && managementStyles.galleryControl)} onClick={copy}>
            <Copy className="h-4 w-4 mr-1" strokeWidth={1.8} /> Copy Gallery Link
          </Button>
          <Button
            variant="outline"
            className={cn('lv-premium-shade h-11 w-full', isGlass && managementStyles.galleryControl)}
            onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
            disabled={!guestUrl}
          >
            <ExternalLink className="h-4 w-4 mr-1" strokeWidth={1.8} /> Open Gallery
          </Button>
          <Button variant="outline" className={cn('lv-premium-shade h-11 w-full', isGlass && managementStyles.galleryControl)} onClick={downloadQr} disabled={!qrDataUrl}>
            <Download className="h-4 w-4 mr-1" /> Download QR code
          </Button>
        </div>
      )}

      <p className={cn('text-xs text-muted-foreground break-words', isGlass && managementStyles.gallerySecondaryText)}>
        Only approved media appears in the guest gallery. Anything you hide in your media library stays private.
      </p>
    </Card>
  );
};

export default GalleryViewAccessCard;
