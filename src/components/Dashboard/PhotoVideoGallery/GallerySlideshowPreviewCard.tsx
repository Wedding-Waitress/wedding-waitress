// Slideshow Preview — 16:9 preview that mirrors the real Live Slideshow behaviour.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Maximize, Minimize, Presentation } from 'lucide-react';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { guestVisibleItems } from '@/lib/mediaPrivacy';
import { applySlideshowSettings, type SlideshowSettings } from '@/lib/slideshowSettings';

const MAX_VIDEO_MS = 15 * 1000;

interface Props {
  items: GalleryItem[];
  settings: SlideshowSettings;
  loading?: boolean;
}

export const GallerySlideshowPreviewCard: React.FC<Props> = ({ items, settings, loading }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Only approved, uploaded, non-guestbook photos/videos are eligible — same rule as the live route.
  const eligible = useMemo(() => {
    const approved = guestVisibleItems(items).filter(i => !!i.signed_url);
    return applySlideshowSettings(approved, settings);
  }, [items, settings]);

  const photoCount = eligible.filter(i => i.kind === 'photo').length;
  const videoCount = eligible.filter(i => i.kind === 'video').length;

  useEffect(() => { setIndex(0); }, [settings.order, settings.include_photos, settings.include_videos, settings.albums.join('|')]);
  useEffect(() => { if (index >= eligible.length) setIndex(0); }, [eligible.length, index]);

  const advance = useCallback(() => {
    setIndex(i => {
      if (eligible.length === 0) return 0;
      const next = i + 1;
      if (next >= eligible.length) return settings.loop ? 0 : i;
      return next;
    });
    if (!settings.loop && index + 1 >= eligible.length) setPaused(true);
  }, [eligible.length, settings.loop, index]);

  const current = eligible.length ? eligible[Math.min(index, eligible.length - 1)] : null;

  useEffect(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (!current || paused) return;
    const ms = current.kind === 'photo' ? settings.slide_duration_sec * 1000 : MAX_VIDEO_MS;
    timerRef.current = window.setTimeout(advance, ms);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [current?.id, paused, settings.slide_duration_sec, advance]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) stageRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const transitionClass =
    settings.transition === 'none'
      ? ''
      : settings.transition === 'slide'
        ? 'animate-in slide-in-from-right-8 duration-500'
        : 'animate-in fade-in duration-700';

  return (
    <Card className="p-5 sm:p-6 space-y-5 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
            <Presentation size={22} strokeWidth={1.8} className="text-[#967A59] shrink-0" /> Slideshow Preview
          </h2>
          <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
            Exactly what your guests will see on the big screen.
          </p>
        </div>
        <div className="text-sm text-muted-foreground shrink-0">
          {photoCount} photo{photoCount === 1 ? '' : 's'} · {videoCount} video{videoCount === 1 ? '' : 's'} eligible
        </div>
      </div>

      <div ref={stageRef} className="relative w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
        {loading ? (
          <p className="text-white/70 text-sm">Loading media…</p>
        ) : !current ? (
          <div className="text-center px-6">
            <p className="text-white text-lg font-light">No approved media matches these settings yet.</p>
            <p className="text-white/60 text-sm mt-2">Approve some guest photos or videos, or widen your album selection.</p>
          </div>
        ) : current.kind === 'photo' ? (
          <img
            key={current.id}
            src={current.signed_url}
            alt={current.caption || 'Guest photo'}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 w-full h-full object-contain ${transitionClass}`}
          />
        ) : (
          <video
            key={current.id}
            src={current.signed_url}
            autoPlay={!paused}
            muted
            playsInline
            preload="metadata"
            onEnded={advance}
            onError={advance}
            className={`absolute inset-0 w-full h-full object-contain ${transitionClass}`}
          />
        )}

        {current && settings.show_caption && (current.caption || current.uploader_name) && (
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
            {current.caption && <p className="text-white text-base font-light truncate">{current.caption}</p>}
            {current.uploader_name && (
              <p className="text-white/75 text-sm">Shared by {current.uploader_name.trim().split(/\s+/)[0]}</p>
            )}
          </div>
        )}

        {eligible.length > 0 && (
          <span className="absolute top-3 right-4 text-white/70 text-xs font-medium">
            {Math.min(index + 1, eligible.length)} / {eligible.length}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => setIndex(i => (eligible.length ? (i - 1 + eligible.length) % eligible.length : 0))} disabled={!eligible.length}>
          <SkipBack size={16} strokeWidth={1.8} className="mr-1.5" /> Previous
        </Button>
        <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => setPaused(p => !p)} disabled={!eligible.length}>
          {paused ? <><Play size={16} strokeWidth={1.8} className="mr-1.5" /> Play</> : <><Pause size={16} strokeWidth={1.8} className="mr-1.5" /> Pause</>}
        </Button>
        <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => setIndex(i => (eligible.length ? (i + 1) % eligible.length : 0))} disabled={!eligible.length}>
          <SkipForward size={16} strokeWidth={1.8} className="mr-1.5" /> Next
        </Button>
        <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => { setIndex(0); setPaused(false); }} disabled={!eligible.length}>
          <RotateCcw size={16} strokeWidth={1.8} className="mr-1.5" /> Restart
        </Button>
        <Button variant="outline" size="sm" className="lv-premium-shade" onClick={toggleFullscreen} disabled={!eligible.length}>
          {isFs ? <><Minimize size={16} strokeWidth={1.8} className="mr-1.5" /> Exit fullscreen</> : <><Maximize size={16} strokeWidth={1.8} className="mr-1.5" /> Fullscreen</>}
        </Button>
      </div>
    </Card>
  );
};

export default GallerySlideshowPreviewCard;
