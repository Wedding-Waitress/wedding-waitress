import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, Copy, ExternalLink, MessageCircle, PenLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildGalleryGuestbookUrl } from '@/lib/urlUtils';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

export const GalleryGuestbookCard: React.FC<{
  meta: GalleryMeta;
  onToggleVoice: (enabled: boolean) => Promise<void>;
}> = ({ meta, onToggleVoice }) => {
  const { toast } = useToast();
  const url = meta.primary_token ? buildGalleryGuestbookUrl(meta.primary_token) : '';

  const handleToggle = async (enabled: boolean) => {
    try {
      await onToggleVoice(enabled);
      toast({ title: enabled ? 'Voice Guestbook enabled' : 'Voice Guestbook disabled' });
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
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#967A59]/10 flex items-center justify-center shrink-0">
          <MessageCircle className="h-5 w-5 text-[#967A59]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-black" style={{ color: '#000000' }}>Guestbook</h2>
          <p className="text-sm mt-1" style={{ color: '#1a1a1a' }}>
            Guests can leave a written note, a voice message, or both — all in one Guestbook tab.
          </p>
        </div>
      </div>

      {/* Text messages */}
      <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <PenLine className="h-4 w-4 mt-0.5 text-[#967A59]" />
          <div>
            <p className="text-sm font-medium text-[#1D1D1F]">Text messages</p>
            <p className="text-xs text-[#6E6E73]">Always available while the gallery is open.</p>
          </div>
        </div>
        <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
          Enabled
        </span>
      </div>

      {/* Voice messages */}
      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2">
            <Mic className="h-4 w-4 mt-0.5 text-[#967A59]" />
            <div>
              <p className="text-sm font-medium text-[#1D1D1F]">Voice messages</p>
              <p className="text-xs text-[#6E6E73]">Guests record a short voice or video message (max 60 seconds).</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="guestbook-voice-toggle" className="text-sm">Enabled</Label>
            <Switch
              id="guestbook-voice-toggle"
              checked={meta.voice_guestbook_enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>

        {meta.voice_guestbook_enabled && (
          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-[#6E6E73]">Guest Voice Guestbook link</Label>
              <p className="text-sm break-all mt-1 text-[#1D1D1F]">{url || '—'}</p>
              <p className="text-xs text-[#6E6E73] mt-1">Uses the same gallery link — no new QR needed.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button className="lv-premium-shade" variant="outline" size="sm" onClick={copy} disabled={!url}>
                <Copy className="h-4 w-4 mr-1" /> Copy link
              </Button>
              <Button className="lv-premium-shade" variant="outline" size="sm" onClick={open} disabled={!url}>
                <ExternalLink className="h-4 w-4 mr-1" /> Open Voice Guestbook
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GalleryGuestbookCard;
