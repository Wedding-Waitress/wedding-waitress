import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, Download, QrCode as QrIcon, AlertTriangle, Play, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryUploadUrl, buildGalleryLiveUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

export const GallerySetupCard: React.FC<{
  meta: GalleryMeta;
  onToggleOpen: (open: boolean) => void;
}> = ({ meta, onToggleOpen }) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const guestUrl = meta.primary_token ? buildGalleryUploadUrl(meta.primary_token) : '';

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
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2"><QrIcon className="h-5 w-5 text-[#967A59]" /> Guest Upload Link</h2>
          <p className="text-sm text-muted-foreground">Share this QR code or link with your guests.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="open-toggle" className="text-sm">Gallery open</Label>
          <Switch id="open-toggle" checked={meta.is_open} onCheckedChange={onToggleOpen} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5 items-start">
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Gallery QR code" className="w-44 h-44 rounded-lg border border-border" />
          ) : (
            <div className="w-44 h-44 rounded-lg border border-dashed border-border" />
          )}
        </div>
        <div className="space-y-3">
          {!meta.primary_token ? (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">Upload link not ready — please retry.</p>
            </div>
          ) : (
            <div>
              <Label className="text-sm">Public upload link</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={guestUrl} readOnly className="h-11 text-sm" />
                <Button variant="outline" className="lv-premium-shade h-11" onClick={copy}>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="lv-premium-shade" onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-1" /> Download QR code
            </Button>
            <Button
              variant="outline"
              className="lv-premium-shade"
              onClick={() => meta.primary_token && window.open(buildGalleryLiveUrl(meta.primary_token), '_blank', 'noopener,noreferrer')}
              disabled={!meta.primary_token}
              title="Open the public slideshow in a new tab — ideal for a TV or projector"
            >
              <Play className="h-4 w-4 mr-1" /> Open Live View
            </Button>
            <Button
              variant="outline"
              className="lv-premium-shade"
              onClick={async () => {
                if (!meta.primary_token) return;
                const url = buildGalleryLiveUrl(meta.primary_token);
                await navigator.clipboard.writeText(url);
                toast({ title: 'Live View link copied' });
              }}
              disabled={!meta.primary_token}
              title="Copy the public Live View URL to your clipboard"
            >
              <Link2 className="h-4 w-4 mr-1" /> Copy Live View link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This link does not expire. Switch <strong>Gallery open</strong> off to stop new uploads.
            Live View shows only approved uploads — hidden items never appear.
          </p>
        </div>
      </div>
    </Card>
  );
};
