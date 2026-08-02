// Guest Features card — enable/disable guest-facing features per event.
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { SlidersHorizontal } from 'lucide-react';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

interface Props {
  meta: GalleryMeta;
  onToggleUpload: (v: boolean) => Promise<void>;
  onToggleGalleryView: (v: boolean) => Promise<void>;
  onToggleGuestbookText: (v: boolean) => Promise<void>;
  onToggleVoice: (v: boolean) => Promise<void>;
  onTogglePhotoBooth: (v: boolean) => Promise<void>;
  onToggleSlideshow: (v: boolean) => Promise<void>;
}

export const GalleryGuestFeaturesCard: React.FC<Props> = ({
  meta, onToggleUpload, onToggleGalleryView, onToggleGuestbookText,
  onToggleVoice, onTogglePhotoBooth, onToggleSlideshow,
}) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: (v: boolean) => Promise<void>, v: boolean) => {
    setBusy(key);
    try {
      await fn(v);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const features: { key: string; title: string; desc: string; checked: boolean; fn: (v: boolean) => Promise<void> }[] = [
    { key: 'upload', title: 'Upload Photo & Video', desc: 'Allow guests to upload photos and videos', checked: !!meta.guest_upload_enabled, fn: onToggleUpload },
    { key: 'view', title: 'Photo & Video Gallery View', desc: 'Let guests browse the shared gallery', checked: !!meta.gallery_view_enabled, fn: onToggleGalleryView },
    { key: 'gbtext', title: 'Guestbook - Text Message', desc: 'Allow guests to leave a written message', checked: !!meta.guestbook_text_enabled, fn: onToggleGuestbookText },
    { key: 'gbvoice', title: 'Guestbook - Voice Message', desc: 'Allow guests to record a voice message', checked: !!meta.voice_guestbook_enabled, fn: onToggleVoice },
    { key: 'booth', title: 'Photo Booth', desc: 'Let guests use the on-screen photo booth', checked: !!meta.photo_booth_enabled, fn: onTogglePhotoBooth },
    { key: 'slideshow', title: 'Live Slide Show', desc: 'Display uploaded photos in a live slideshow', checked: !!meta.slideshow_enabled, fn: onToggleSlideshow },
  ];

  return (
    <Card className="p-5 sm:p-6 space-y-5" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}>
      <div>
        <h2 className="text-xl font-bold text-black flex items-center gap-2" style={{ color: '#000000' }}><SlidersHorizontal className="h-5 w-5 text-[#967A59]" /> Guest Experiences</h2>
        <p className="text-sm mt-1" style={{ color: '#1a1a1a' }}>Enable or disable the features your guests can see and use.</p>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(f => (
          <div
            key={f.key}
            className="rounded-xl border p-4 flex flex-col justify-between gap-4"
            style={{ backgroundColor: '#472c1d', borderColor: 'rgba(255,255,255,0.18)' }}
          >
            <div>
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">{f.desc}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">{f.checked ? 'On' : 'Off'}</span>
              <Switch
                checked={f.checked}
                disabled={busy === f.key}
                onCheckedChange={(v) => run(f.key, f.fn, v)}
                aria-label={f.title}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GalleryGuestFeaturesCard;
