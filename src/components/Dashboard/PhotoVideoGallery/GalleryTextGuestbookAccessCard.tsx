// Digital Guestbook Access — QR code + public guestbook link (text-message workspace).
// Reuses the existing event gallery token and guest-facing /gallery/:token?tab=guestbook route.
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Download, QrCode as QrIcon, TriangleAlert, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryGuestAppUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

export function buildTextGuestbookUrl(token: string | null): string {
  return buildGalleryGuestAppUrl(token);
}

export const GalleryTextGuestbookAccessCard: React.FC<{ meta: GalleryMeta; appearance?: 'default' | 'espresso-glass' }> = ({ meta, appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const url = buildTextGuestbookUrl(meta.primary_token);

  useEffect(() => {
    if (!url) { setQrDataUrl(''); return; }
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [url]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Digital Guestbook link copied' });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'guestbook-qr.png';
    a.click();
  };

  const open = () => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

  return (
    <Card className={cn('h-full p-5 sm:p-6 space-y-6 overflow-hidden', isGlass && managementStyles.glassCard)} data-appearance={isGlass ? appearance : undefined}>
      <div className="min-w-0">
        <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
          <QrIcon className={cn('h-5 w-5 text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} strokeWidth={1.8} /> Digital Guestbook Access
        </h2>
        <p className={cn('text-sm mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)} style={isGlass ? undefined : { color: '#1a1a1a' }}>
          Share the QR code or link your guests use to write a message in your Digital Guestbook.
        </p>
      </div>

      <div className="space-y-4 min-w-0">
        {!meta.primary_token ? (
          <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
            <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" strokeWidth={1.8} />
            <p className="text-sm text-destructive">Digital Guestbook link not ready — please retry.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <div className={cn(isGlass && managementStyles.galleryViewQrFrame)}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Digital Guestbook QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" />
                ) : (
                  <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border" />
                )}
              </div>
            </div>

            <div>
              <Label className={cn('text-sm', isGlass && managementStyles.galleryViewHeading)}>Public Digital Guestbook link</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Input value={url} readOnly className={cn('h-11 text-sm min-w-0 flex-1', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassField)} />
                <Button variant="outline" className={cn('lv-premium-shade h-11 shrink-0', isGlass && managementStyles.galleryControl)} onClick={copy}>
                  <Copy className="h-4 w-4 mr-1" strokeWidth={1.8} /> Copy
                </Button>
              </div>
            </div>

            <Button variant="outline" className={cn('lv-premium-shade w-full', isGlass && managementStyles.galleryControl)} onClick={open} disabled={!url}>
              <ExternalLink className="h-4 w-4 mr-1" strokeWidth={1.8} /> Open Digital Guestbook
            </Button>
            <Button variant="outline" className={cn('lv-premium-shade w-full', isGlass && managementStyles.galleryControl)} onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-1" strokeWidth={1.8} /> Download QR code
            </Button>
          </>
        )}

        <p className={cn('text-xs text-muted-foreground', isGlass && managementStyles.gallerySecondaryText)}>
          This uses your existing event gallery link — no separate token or guest page is created.
        </p>
      </div>
    </Card>
  );
};

export default GalleryTextGuestbookAccessCard;
