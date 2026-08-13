// Guest Features card — enable/disable guest-facing features per event.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { SlidersHorizontal, CloudUpload, Images, BookHeart, Camera, Presentation, Settings2, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

interface Props {
  meta: GalleryMeta;
  onToggleUpload: (v: boolean) => Promise<void>;
  onToggleGalleryView: (v: boolean) => Promise<void>;
  /** Unified Digital Guestbook toggle — written, audio and video messages together. */
  onToggleGuestbook: (v: boolean) => Promise<void>;
  onTogglePhotoBooth: (v: boolean) => Promise<void>;
  onToggleSlideshow: (v: boolean) => Promise<void>;
}

export const GalleryGuestFeaturesCard: React.FC<Props> = ({
  meta, onToggleUpload, onToggleGalleryView, onToggleGuestbook,
  onTogglePhotoBooth, onToggleSlideshow,
}) => {
  const navigate = useNavigate();
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

  const features: { key: string; title: string; desc: string; Icon: LucideIcon; checked: boolean; fn: (v: boolean) => Promise<void>; href?: string }[] = [
    { key: 'upload', Icon: CloudUpload, title: 'Photo & Video Sharing', desc: 'Let guests share photos and videos from your event', checked: !!meta.guest_upload_enabled, fn: onToggleUpload, href: '/dashboard/photo-video-gallery/photo-video-sharing' },
    { key: 'view', Icon: Images, title: 'Photo & Video Gallery View', desc: 'Let guests browse the shared gallery', checked: !!meta.gallery_view_enabled, fn: onToggleGalleryView, href: '/dashboard/photo-video-gallery/gallery-view' },
    { key: 'guestbook', Icon: BookHeart, title: 'Digital Guestbook', desc: 'Let guests leave private written, audio or video messages and well wishes', checked: !!meta.guestbook_text_enabled || !!meta.voice_guestbook_enabled, fn: onToggleGuestbook, href: '/dashboard/photo-video-gallery/digital-guestbook' },
    { key: 'booth', Icon: Camera, title: 'Digital Photo Booth', desc: 'Let guests use the on-screen digital photo booth', checked: !!meta.photo_booth_enabled, fn: onTogglePhotoBooth, href: '/dashboard/photo-video-gallery/digital-photo-booth' },
    { key: 'slideshow', Icon: Presentation, title: 'Live Slideshow', desc: 'Display uploaded photos in a live slideshow', checked: !!meta.slideshow_enabled, fn: onToggleSlideshow, href: '/dashboard/photo-video-gallery/live-slideshow' },
  ];


  return (
    <Card
      className="p-4 sm:p-5 md:p-6 space-y-5 overflow-hidden !bg-none !bg-[#21130f]/62 !border-[#c9975d]/40 !shadow-[inset_0_1px_0_rgba(255,239,218,0.21),0_18px_42px_rgba(3,1,1,0.42)]"
      style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-[-0.012em] leading-tight text-white flex items-center gap-2"><SlidersHorizontal size={22} strokeWidth={1.8} className="text-[#d9b77f] shrink-0" aria-hidden="true" /> Guest Experience Features</h2>
        <p className="text-sm font-normal mt-1 break-words text-[#e8ddd2]">Enable or disable the features your guests can see and use.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {features.map(f => (
          <div
            key={f.key}
            className="rounded-xl border p-4 sm:p-5 flex flex-col justify-between gap-4 h-full min-w-0 transition-[box-shadow,transform] duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-px [@media(hover:hover)_and_(pointer:fine)]:hover:!shadow-[inset_0_1px_0_rgba(255,239,218,0.19),inset_0_0_18px_rgba(197,112,48,0.04),0_14px_30px_rgba(3,1,1,0.35)] [@media(hover:none)]:active:translate-y-px [@media(hover:none)]:active:!shadow-[inset_0_1px_0_rgba(255,239,218,0.18),inset_0_0_14px_rgba(197,112,48,0.04),0_9px_20px_rgba(3,1,1,0.31)] motion-reduce:transition-none motion-reduce:!transform-none"
            style={{
              background: 'linear-gradient(180deg, rgba(101, 57, 40, 0.72) 0%, rgba(42, 23, 17, 0.76) 100%)',
              borderColor: 'rgba(201, 151, 93, 0.38)',
              boxShadow: 'inset 0 1px 0 rgba(255, 239, 218, 0.14), 0 12px 26px rgba(3, 1, 1, 0.32)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              minHeight: '190px',
            }}
          >
            <div className="min-w-0">
              <f.Icon size={24} strokeWidth={1.8} className="text-white mb-2 shrink-0" aria-hidden="true" />
              <p className="text-[18px] sm:text-[17px] font-semibold tracking-[-0.012em] leading-tight text-white break-words">{f.title}</p>
              <p className="text-sm font-normal mt-2 leading-relaxed text-[#e8ddd2] break-words">{f.desc}</p>
            </div>

            <div className="flex items-end justify-between gap-2">
              <button
                type="button"
                aria-label={`Manage ${f.title}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (f.href) navigate(f.href); }}
                className="shrink-0 rounded-full border border-[#d8ad79]/55 px-2.5 py-1.5 min-h-[40px] text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,239,218,0.16),inset_0_-1px_0_rgba(0,0,0,0.28),0_5px_12px_rgba(2,1,1,0.24)] backdrop-blur-md transition-all duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#efc58f]/85 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[inset_0_1px_0_rgba(255,242,224,0.20),inset_0_-1px_0_rgba(0,0,0,0.24),inset_0_0_14px_rgba(198,112,48,0.08),0_6px_15px_rgba(3,1,1,0.28),0_0_8px_rgba(204,132,67,0.10)] [@media(hover:hover)_and_(pointer:fine)]:hover:brightness-[1.04] active:!shadow-[inset_0_1px_0_rgba(255,239,218,0.13),inset_0_2px_5px_rgba(0,0,0,0.20),inset_0_0_12px_rgba(192,103,43,0.08),0_3px_8px_rgba(2,1,1,0.22)] active:!brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b97e]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#28140e] active:translate-y-[1px] motion-reduce:transition-none motion-reduce:!transform-none inline-flex items-center gap-1.5"
                style={{ background: 'linear-gradient(180deg, rgba(77, 43, 31, 0.74) 0%, rgba(18, 10, 8, 0.8) 100%)' }}
              >
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[#e3b372]/30 bg-[#b86932]/25 shadow-[inset_0_1px_0_rgba(255,231,199,0.16)]" aria-hidden="true">
                  <Settings2 size={13} strokeWidth={1.8} className="text-[#f2d4ad]" />
                </span>
                <span>Manage</span>
                <ChevronRight size={13} strokeWidth={1.8} className="shrink-0 text-[#ead8bd]/80" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white/85">{f.checked ? 'On' : 'Off'}</span>
                <Switch
                  checked={f.checked}
                  disabled={busy === f.key}
                  onCheckedChange={(v) => run(f.key, f.fn, v)}
                  aria-label={f.title}
                  className="!h-[22px] !w-[42px] !px-[2px] data-[state=checked]:!bg-gradient-to-b data-[state=checked]:!from-[#39d87f] data-[state=checked]:!to-[#16a758] data-[state=checked]:!shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_9px_rgba(34,197,94,0.22)] data-[state=unchecked]:!bg-[#1b100d] data-[state=unchecked]:!shadow-[inset_0_1px_0_rgba(255,239,218,0.08),0_0_0_1px_rgba(201,151,93,0.22)] hover:data-[state=unchecked]:!bg-[#24140f] focus-visible:!ring-[#d8a665]/60 focus-visible:!ring-offset-[#2b1711] [&>span]:!h-[18px] [&>span]:!w-[18px] [&>span]:!bg-white [&>span]:!shadow-[0_1px_4px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.9)] [&>span[data-state=checked]]:!translate-x-5"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GalleryGuestFeaturesCard;
