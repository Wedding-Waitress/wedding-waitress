// Guest Gallery Access — public link to the guest-facing gallery view.
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Images, AlertTriangle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

export const GalleryViewAccessCard: React.FC<{ meta: GalleryMeta; guestUrl: string }> = ({ meta, guestUrl }) => {
  const { toast } = useToast();

  const copy = async () => {
    if (!guestUrl) return;
    await navigator.clipboard.writeText(guestUrl);
    toast({ title: 'Gallery link copied' });
  };

  return (
    <Card className="h-full p-5 sm:p-6 space-y-5 overflow-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <Images className="h-5 w-5 text-[#967A59] shrink-0" /> Guest Gallery Access
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Share this link so guests can browse the photos and videos from your event.
        </p>
      </div>

      {!meta.primary_token ? (
        <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">Gallery link not ready — please retry.</p>
        </div>
      ) : (
        <div>
          <Label className="text-sm">Public gallery link</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <Input value={guestUrl} readOnly className="h-11 text-sm min-w-0 flex-1" />
            <Button variant="outline" className="lv-premium-shade h-11 shrink-0" onClick={copy}>
              <Copy className="h-4 w-4 mr-1" /> Copy gallery link
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="lv-premium-shade"
          onClick={() => guestUrl && window.open(guestUrl, '_blank', 'noopener,noreferrer')}
          disabled={!guestUrl}
        >
          <ExternalLink className="h-4 w-4 mr-1" /> Open gallery
        </Button>
      </div>

      <p className="text-xs text-muted-foreground break-words">
        Only approved media appears in the guest gallery. Anything you hide in your media library stays private.
      </p>
    </Card>
  );
};

export default GalleryViewAccessCard;
