// Digital Photo Booth Access — QR code + guest photo-booth link (feature workspace).
// Reuses the existing event gallery token and guest-facing /gallery-photobooth route.
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Download, QrCode as QrIcon, AlertTriangle, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryPhotoBoothUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

export const GalleryPhotoBoothAccessCard: React.FC<{ meta: GalleryMeta }> = ({ meta }) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const boothUrl = meta.primary_token ? buildGalleryPhotoBoothUrl(meta.primary_token) : '';

  useEffect(() => {
    if (!boothUrl) { setQrDataUrl(''); return; }
    QRCode.toDataURL(boothUrl, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [boothUrl]);

  const copy = async () => {
    if (!boothUrl) return;
    await navigator.clipboard.writeText(boothUrl);
    toast({ title: 'Digital Photo Booth link copied' });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'photo-booth-qr.png';
    a.click();
  };

  const launch = () => {
    if (boothUrl) window.open(boothUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="h-full p-5 sm:p-6 space-y-6 overflow-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <QrIcon className="h-5 w-5 text-[#967A59] shrink-0" /> Digital Photo Booth Access
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Share the QR code or link guests use to open the Digital Photo Booth on their phone or tablet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-6 items-start">
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Digital Photo Booth QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" />
          ) : (
            <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border" />
          )}
        </div>

        <div className="space-y-4 min-w-0">
          {!meta.primary_token ? (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">Digital Photo Booth link not ready — please retry.</p>
            </div>
          ) : (
            <div>
              <Label className="text-sm">Event Digital Photo Booth Link</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Input value={boothUrl} readOnly className="h-11 text-sm min-w-0 flex-1" />
                <Button variant="outline" className="lv-premium-shade h-11 shrink-0" onClick={copy}>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="lv-premium-shade" onClick={launch} disabled={!boothUrl}>
              <Camera className="h-4 w-4 mr-1" /> Launch Digital Photo Booth
            </Button>
            <Button variant="outline" className="lv-premium-shade" onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-1" /> Download QR code
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            This uses your existing event gallery link — no separate token or guest page is created.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default GalleryPhotoBoothAccessCard;
