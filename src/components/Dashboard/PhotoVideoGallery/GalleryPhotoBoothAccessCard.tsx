// Digital Photo Booth Access — QR code + guest photo-booth link (feature workspace).
// Reuses the existing event gallery token and guest-facing /gallery-photobooth route.
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Download, QrCode as QrIcon, TriangleAlert, Camera, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryGuestAppUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

export const GalleryPhotoBoothAccessCard: React.FC<{ meta: GalleryMeta; appearance?: 'default' | 'espresso-glass' }> = ({ meta, appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [busy, setBusy] = useState<null | 'launch' | 'download'>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const boothUrl = buildGalleryGuestAppUrl(meta.primary_token);

  useEffect(() => {
    if (!boothUrl) { setQrDataUrl(''); return; }
    QRCode.toDataURL(boothUrl, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [boothUrl]);

  const copy = async () => {
    if (!boothUrl) return;
    try {
      await navigator.clipboard.writeText(boothUrl);
      toast({ title: 'Digital Photo Booth link copied.', duration: 2500 });
      setLiveMessage('Digital Photo Booth link copied.');
    } catch {
      toast({
        title: 'Could not copy the link',
        description: 'Copy it manually from the field above and try again.',
        variant: 'destructive',
      });
      setLiveMessage('Could not copy the Digital Photo Booth link.');
    }
  };

  const downloadQr = async () => {
    if (!qrDataUrl) return;
    setBusy('download');
    try {
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = 'photo-booth-qr.png';
      a.click();
      setLiveMessage('QR code downloaded.');
    } catch {
      toast({ title: 'Could not download the QR code', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const launch = async () => {
    if (!boothUrl) return;
    setBusy('launch');
    try {
      const win = window.open(boothUrl, '_blank', 'noopener,noreferrer');
      if (!win) throw new Error('blocked');
    } catch {
      toast({
        title: 'Could not open the Digital Photo Booth',
        description: 'Your browser may have blocked the new tab. Allow pop-ups and try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };


  return (
    <Card className={cn('h-full p-5 sm:p-6 space-y-6 overflow-hidden', isGlass && managementStyles.glassCard)} data-appearance={isGlass ? appearance : undefined}>
      <div className="min-w-0">
        <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
          <QrIcon className={cn('h-5 w-5 text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} /> Digital Photo Booth Access
        </h2>
        <p className={cn('text-sm mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)} style={isGlass ? undefined : { color: '#1a1a1a' }}>
          Share the QR code or link guests use to open the Digital Photo Booth on their phone or tablet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-6 items-start">
        <div className="flex justify-center">
          {qrDataUrl ? (
            <div className={cn(isGlass && managementStyles.galleryViewQrFrame)}><img src={qrDataUrl} alt="Digital Photo Booth QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" /></div>
          ) : (
            <div className={cn('w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border', isGlass && managementStyles.galleryViewInsetPanel)} />
          )}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          {!meta.primary_token ? (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
              <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" strokeWidth={1.8} />
              <p className="text-sm text-destructive">Digital Photo Booth link not ready — please retry.</p>
            </div>
          ) : (
            <>
              <div>
                <Label className={cn('text-sm', isGlass && managementStyles.galleryViewHeading)}>Event Digital Photo Booth Link</Label>
                <Input value={boothUrl} readOnly className={cn('h-11 text-sm mt-1.5 w-full', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassField)} />
              </div>
              <Button variant="outline" className={cn('lv-premium-shade h-11 w-full', isGlass && managementStyles.galleryControl)} onClick={copy}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </>
          )}

          <Button variant="outline" className={cn('lv-premium-shade h-11 w-full', isGlass && managementStyles.galleryControl)} onClick={launch} disabled={!boothUrl || busy !== null}>
            {busy === 'launch' ? (
              <><LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> Launching…</>
            ) : (
              <><Camera className="h-4 w-4 mr-1" /> Launch Digital Photo Booth</>
            )}
          </Button>
          <Button variant="outline" className={cn('lv-premium-shade h-11 w-full', isGlass && managementStyles.galleryControl)} onClick={downloadQr} disabled={!qrDataUrl || busy !== null}>
            {busy === 'download' ? (
              <><LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> Downloading…</>
            ) : (
              <><Download className="h-4 w-4 mr-1" /> Download QR code</>
            )}
          </Button>

          <p className="sr-only" role="status" aria-live="polite">{liveMessage}</p>

          <p className={cn('text-xs text-muted-foreground mt-1', isGlass && managementStyles.gallerySecondaryText)}>
            This uses your existing event gallery link — no separate token or guest page is created.
          </p>

        </div>
      </div>
    </Card>
  );
};

export default GalleryPhotoBoothAccessCard;
