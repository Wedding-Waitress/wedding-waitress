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
    { key: 'upload', title: 'Upload Photos & Videos', desc: 'Allow guests to upload photos and videos', checked: !!meta.guest_upload_enabled, fn: onToggleUpload },
    { key: 'view', title: 'Photo & Video Gallery View', desc: 'Let guests browse the shared gallery', checked: !!meta.gallery_view_enabled, fn: onToggleGalleryView },
    { key: 'booth', title: 'Photo Booth', desc: 'Let guests use the on-screen photo booth', checked: !!meta.photo_booth_enabled, fn: onTogglePhotoBooth },
    { key: 'gbvoice', title: 'Guestbook - Voice Message', desc: 'Allow guests to record a voice message', checked: !!meta.voice_guestbook_enabled, fn: onToggleVoice },
    { key: 'gbtext', title: 'Guestbook - Text Message', desc: 'Allow guests to leave a written message', checked: !!meta.guestbook_text_enabled, fn: onToggleGuestbookText },
    { key: 'slideshow', title: 'Live Slide Show', desc: 'Display uploaded photos in a live slideshow', checked: !!meta.slideshow_enabled, fn: onToggleSlideshow },
  ];

  return (
    <Card className="p-4 sm:p-5 md:p-6 space-y-5 overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-black flex items-center gap-2" style={{ color: '#000000' }}><SlidersHorizontal className="h-5 w-5 text-[#967A59] shrink-0" /> Guest Experience Features</h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>Enable or disable the features your guests can see and use.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(f => (
          <div
            key={f.key}
            className="rounded-xl border p-4 sm:p-5 flex flex-col justify-between gap-4 sm:gap-5 transition-shadow h-full min-w-0"
            style={{
              backgroundColor: '#967A59',
              borderColor: 'rgba(0,0,0,0.10)',
              boxShadow: '0 4px 14px -4px rgba(29,29,31,0.25), 0 1px 3px rgba(29,29,31,0.10)',
              minHeight: '190px',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-[18px] md:text-[20px] lg:text-[24px] font-bold leading-tight text-white break-words">{f.title}</p>
                <p className="text-xs md:text-sm lg:text-base mt-2 leading-relaxed text-white/90 break-words">{f.desc}</p>
              </div>
              <button
                type="button"
                aria-label={`Manage ${f.title}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="shrink-0 self-start sm:self-auto rounded-full border-2 border-white bg-transparent px-4 py-1.5 min-h-[44px] text-sm font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-200 ease-out hover:bg-white hover:text-[#967A59] active:translate-y-[1px]"
              >
                Manage
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg md:text-xl font-bold text-white">{f.checked ? 'On' : 'Off'}</span>
              <Switch
                checked={f.checked}
                disabled={busy === f.key}
                onCheckedChange={(v) => run(f.key, f.fn, v)}
                aria-label={f.title}
                className="shrink-0 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GalleryGuestFeaturesCard;
