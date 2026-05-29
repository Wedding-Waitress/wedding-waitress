import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, Copy, ExternalLink, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryGuestbookUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

export const GalleryVideoGuestbookCard: React.FC<{
  meta: GalleryMeta;
  onToggle: (enabled: boolean) => Promise<void>;
}> = ({ meta, onToggle }) => {
  const { toast } = useToast();
  const url = meta.primary_token ? buildGalleryGuestbookUrl(meta.primary_token) : '';

  const handleToggle = async (enabled: boolean) => {
    try {
      await onToggle(enabled);
      toast({ title: enabled ? 'Video Guestbook enabled' : 'Video Guestbook disabled' });
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message, variant: 'destructive' });
    }
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copied' });
  };

  const open = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#967A59]/10 flex items-center justify-center shrink-0">
            <Video className="h-5 w-5 text-[#967A59]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Video Guestbook</h2>
            <p className="text-sm text-muted-foreground">Let guests leave a short video or voice message (max 60 seconds).</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="guestbook-toggle" className="text-sm">Enabled</Label>
          <Switch id="guestbook-toggle" checked={meta.video_guestbook_enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {meta.video_guestbook_enabled && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-wide text-[#6E6E73]">Guest Video Guestbook link</Label>
            <p className="text-sm break-all mt-1 text-[#1D1D1F]">{url || '—'}</p>
            <p className="text-xs text-[#6E6E73] mt-1 flex items-center gap-1"><Mic className="h-3 w-3" /> Uses the same gallery link — no new QR needed.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button className="lv-premium-shade" variant="outline" size="sm" onClick={copy} disabled={!url}>
              <Copy className="h-4 w-4 mr-1" /> Copy link
            </Button>
            <Button className="lv-premium-shade" variant="outline" size="sm" onClick={open} disabled={!url}>
              <ExternalLink className="h-4 w-4 mr-1" /> Open Video Guestbook
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
