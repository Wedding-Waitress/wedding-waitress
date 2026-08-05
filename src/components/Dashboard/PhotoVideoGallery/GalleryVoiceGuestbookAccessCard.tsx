// Audio Guestbook Access — QR code + public guestbook link (voice-message workspace).
// Reuses the existing event gallery token and the guest-facing recording route.
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

export function buildVoiceGuestbookUrl(token: string | null): string {
  return buildGalleryGuestAppUrl(token);
}

export const GalleryVoiceGuestbookAccessCard: React.FC<{ meta: GalleryMeta }> = ({ meta }) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const url = buildVoiceGuestbookUrl(meta.primary_token);

  useEffect(() => {
    if (!url) { setQrDataUrl(''); return; }
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#1D1D1F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [url]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Audio Guestbook link copied' });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'voice-guestbook-qr.png';
    a.click();
  };

  const open = () => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

  return (
    <Card className="h-full p-5 sm:p-6 space-y-6 overflow-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <QrIcon className="h-5 w-5 text-[#967A59] shrink-0" strokeWidth={1.8} /> Audio Guestbook Access
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Share the QR code or link your guests use to record a voice message for you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-6 items-start">
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Audio Guestbook QR code" className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-border" />
          ) : (
            <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg border border-dashed border-border" />
          )}
        </div>

        <div className="space-y-4 min-w-0">
          {!meta.primary_token ? (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
              <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" strokeWidth={1.8} />
              <p className="text-sm text-destructive">Audio Guestbook link not ready — please retry.</p>
            </div>
          ) : (
            <div>
              <Label className="text-sm">Public Audio Guestbook link</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Input value={url} readOnly className="h-11 text-sm min-w-0 flex-1" />
                <Button variant="outline" className="lv-premium-shade h-11 shrink-0" onClick={copy}>
                  <Copy className="h-4 w-4 mr-1" strokeWidth={1.8} /> Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="lv-premium-shade" onClick={open} disabled={!url}>
              <ExternalLink className="h-4 w-4 mr-1" strokeWidth={1.8} /> Open Audio Guestbook
            </Button>
            <Button variant="outline" className="lv-premium-shade" onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-1" strokeWidth={1.8} /> Download QR code
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            This uses your existing event gallery token — no separate link or guest page is created.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default GalleryVoiceGuestbookAccessCard;
