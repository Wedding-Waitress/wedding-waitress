import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Maximize, Minimize, Play, Pause, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GalleryPasswordGate, galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import { resolveGalleryTheme } from '@/lib/galleryTheme';
import { resolveGalleryTitle } from '@/lib/galleryTitle';
import { fetchLikedItemIds, toggleGalleryLike } from '@/lib/galleryLikes';
import { formatDisplayDate } from '@/lib/utils';
import {
  applySlideshowSettings,
  slideshowSettingsFromRow,
  DEFAULT_SLIDESHOW_SETTINGS,
  type SlideshowSettings,
} from '@/lib/slideshowSettings';

interface LiveMeta {
  gallery_id: string;
  event_id: string;
  event_name: string | null;
  event_date: string | null;
  show_event_date: boolean;
  partner1_name: string | null;
  partner2_name: string | null;
  gallery_title: string | null;
  slideshow_photo_duration_sec: number;
  password_required: boolean;
  theme_color: string | null;
  background_style: 'light' | 'dark' | 'cream' | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  show_branding: boolean;
  slideshow_enabled: boolean;
  settings: SlideshowSettings;
}

interface LiveItem {
  id: string;
  kind: 'photo' | 'video';
  mime_type: string;
  storage_path: string;
  duration_sec: number | null;
  uploader_name: string | null;
  caption: string | null;
  uploaded_at: string | null;
  album: string | null;
  signed_url: string;
  like_count?: number;
}

const DEFAULT_PHOTO_INTERVAL_SEC = 5;
// Videos play inline (muted) for at most 15 seconds before advancing.
const MAX_VIDEO_MS = 15 * 1000;
// Poll for newly approved uploads (in addition to realtime) every 15s.
const POLL_ITEMS_MS = 15 * 1000;
// Re-fetch signed URLs before they expire (edge function TTL = 600s).
const REFRESH_URLS_MS = 8 * 60 * 1000;
export const LIVE_SLIDESHOW_MANAGEMENT_PATH = '/dashboard/photo-video-gallery/live-slideshow';

type SlideshowExitWindow = Pick<Window, 'close' | 'closed' | 'setTimeout'> & {
  location: Pick<Location, 'replace'>;
};

/** Exit a venue slideshow without ever falling back to the public guest gallery. */
export async function exitLiveSlideshow(
  targetWindow: SlideshowExitWindow = window,
  targetDocument: Pick<Document, 'fullscreenElement' | 'exitFullscreen'> = document,
) {
  if (targetDocument.fullscreenElement) {
    try {
      await targetDocument.exitFullscreen();
    } catch {
      // A denied fullscreen exit must not prevent the safe navigation fallback.
    }
  }

  try {
    targetWindow.close();
  } catch {
    // Some browsers throw instead of ignoring a disallowed window.close().
  }

  targetWindow.setTimeout(() => {
    if (!targetWindow.closed) {
      targetWindow.location.replace(LIVE_SLIDESHOW_MANAGEMENT_PATH);
    }
  }, 100);
}

const GalleryLiveView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  // Projector/TV slideshow route: clean fullscreen, no controls.
  const isSlideshow = location.pathname.endsWith('/slideshow');
  const [meta, setMeta] = useState<LiveMeta | null>(null);
  const [rawItems, setItems] = useState<LiveItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeBusy, setLikeBusy] = useState(false);
  const passwordRef = useRef<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoTimerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const isPausedRef = useRef(isPaused);
  const pendingAdvanceRef = useRef(false);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Restore previously verified password for this token (session-scoped).
  useEffect(() => {
    if (!token) return;
    try {
      const saved = sessionStorage.getItem(galleryPasswordKey(token));
      if (saved) { passwordRef.current = saved; setUnlocked(true); }
    } catch {}
  }, [token]);

  const headerTitle = useMemo(() => resolveGalleryTitle(meta), [meta]);

  const settings = useMemo<SlideshowSettings>(
    () => meta?.settings ?? DEFAULT_SLIDESHOW_SETTINGS,
    [meta?.settings],
  );

  // Only approved, non-hidden media reaches the client; apply saved filters + order.
  const items = useMemo(() => applySlideshowSettings(rawItems, settings), [rawItems, settings]);

  const photoIntervalMs = useMemo(() => {
    const s = settings.slide_duration_sec ?? DEFAULT_PHOTO_INTERVAL_SEC;
    return Math.max(3, Math.min(60, s)) * 1000;
  }, [settings.slide_duration_sec]);

  useEffect(() => {
    document.title = headerTitle ? `${headerTitle} — Live Gallery` : 'Live Gallery';
  }, [headerTitle]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleExitSlideshow = useCallback(() => {
    void exitLiveSlideshow();
  }, []);

  useEffect(() => {
    if (!isSlideshow) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      handleExitSlideshow();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExitSlideshow, isSlideshow]);

  const loadItems = useCallback(async (t: string) => {
    const body: Record<string, string> = { token: t };
    if (passwordRef.current) body.password = passwordRef.current;
    const { data, error: err } = await supabase.functions.invoke('gallery-live-feed', { body });
    if (err) throw new Error(err.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    const rows = (((data as any)?.items || []) as LiveItem[]);
    setItems(prev => {
      if (prev.length && rows.length) {
        const currentId = prev[indexRef.current]?.id;
        const nextIdx = rows.findIndex(r => r.id === currentId);
        if (nextIdx < 0) setIndex(0);
      } else {
        setIndex(0);
      }
      return rows;
    });
    try {
      setLikedIds(await fetchLikedItemIds(t));
    } catch { /* reactions are best-effort */ }
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error: err } = await (supabase as any).rpc('get_event_media_gallery_public', { _token: token });
        if (err) throw new Error(err.message);
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error('Gallery not found');
        if (!active) return;
        const passwordRequired = row.password_required === true;
        setMeta({
          gallery_id: row.gallery_id,
          event_id: row.event_id,
          event_name: row.event_name,
          event_date: row.event_date ?? null,
          show_event_date: row.show_event_date !== false,
          partner1_name: row.partner1_name,
          partner2_name: row.partner2_name,
          gallery_title: row.gallery_title ?? null,
          slideshow_photo_duration_sec: row.slideshow_photo_duration_sec ?? DEFAULT_PHOTO_INTERVAL_SEC,
          password_required: passwordRequired,
          theme_color: row.theme_color ?? null,
          background_style: row.background_style ?? null,
          cover_image_url: row.cover_image_url ?? null,
          logo_image_url: row.logo_image_url ?? null,
          show_branding: row.show_branding !== false,
          settings: slideshowSettingsFromRow(row),
          slideshow_enabled: row.slideshow_enabled !== false,
        });
        // Only fetch items if no password gate, or already unlocked from sessionStorage.
        if (!passwordRequired || passwordRef.current) {
          await loadItems(token);
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Unable to load gallery');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // After unlock, load items.
  useEffect(() => {
    if (unlocked && token && meta?.password_required) {
      loadItems(token).catch((e: any) => setError(e?.message || 'Unable to load gallery'));
    }
  }, [unlocked, token, meta?.password_required, loadItems]);

  // Realtime subscription on event_media_items for this event
  useEffect(() => {
    if (!meta?.event_id || !token) return;
    const channel = supabase
      .channel(`gallery-live:${meta.event_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_media_items', filter: `event_id=eq.${meta.event_id}` },
        () => { loadItems(token).catch(() => {}); }
      )
      .subscribe();
    const poll = window.setInterval(() => { loadItems(token).catch(() => {}); }, POLL_ITEMS_MS);
    const refresh = window.setInterval(() => { loadItems(token).catch(() => {}); }, REFRESH_URLS_MS);
    return () => { supabase.removeChannel(channel); window.clearInterval(poll); window.clearInterval(refresh); };
  }, [meta?.event_id, token, loadItems]);

  // Advance helper (respects pause + loop setting)
  const advance = useCallback(() => {
    if (isPausedRef.current) {
      pendingAdvanceRef.current = true;
      return;
    }
    pendingAdvanceRef.current = false;
    setIndex(i => {
      if (items.length === 0) return 0;
      const next = i + 1;
      if (next >= items.length) return settings.loop ? 0 : i;
      return next;
    });
  }, [items.length, settings.loop]);

  // Photo auto-advance timer; videos advance on `ended` or after 15s max
  useEffect(() => {
    if (photoTimerRef.current) {
      window.clearTimeout(photoTimerRef.current);
      photoTimerRef.current = null;
    }
    if (items.length === 0 || isPaused) return;
    const current = items[index % items.length];
    if (!current) return;
    if (current.kind === 'photo') {
      photoTimerRef.current = window.setTimeout(advance, photoIntervalMs);
    } else {
      photoTimerRef.current = window.setTimeout(advance, MAX_VIDEO_MS);
    }
    return () => {
      if (photoTimerRef.current) {
        window.clearTimeout(photoTimerRef.current);
        photoTimerRef.current = null;
      }
    };
  }, [index, items, advance, isPaused, photoIntervalMs]);

  // If unpaused while a pending advance exists, advance immediately
  useEffect(() => {
    if (!isPaused && pendingAdvanceRef.current) {
      pendingAdvanceRef.current = false;
      advance();
    }
  }, [isPaused, advance]);

  const togglePause = () => setIsPaused(p => !p);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const current = items.length > 0 ? items[index % items.length] : null;
  const prevItemRef = useRef<LiveItem | null>(null);
  const [prevItem, setPrevItem] = useState<LiveItem | null>(null);
  useEffect(() => {
    if (current && prevItemRef.current && prevItemRef.current.id !== current.id) {
      const outgoing = prevItemRef.current;
      setPrevItem(outgoing);
      const t = window.setTimeout(() => setPrevItem(p => (p?.id === outgoing.id ? null : p)), 1000);
      prevItemRef.current = current;
      return () => window.clearTimeout(t);
    }
    prevItemRef.current = current;
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventDateLabel = meta?.show_event_date && meta?.event_date ? formatDisplayDate(meta.event_date) : '';
  const uploaderLabel = current?.uploader_name
    ? `Shared by ${current.uploader_name.trim().split(/\s+/)[0]}`
    : '';

  const handleLike = async () => {
    if (!token || !current || likeBusy) return;
    setLikeBusy(true);
    try {
      const res = await toggleGalleryLike(token, current.id);
      setItems(prev => prev.map(i => (i.id === current.id ? { ...i, like_count: res.like_count } : i)));
      setLikedIds(prev => {
        const next = new Set(prev);
        if (res.liked) next.add(current.id); else next.delete(current.id);
        return next;
      });
    } catch { /* ignore — guest reactions are non-critical */ }
    finally { setLikeBusy(false); }
  };

  const theme = resolveGalleryTheme(meta);

  if (meta?.password_required && !unlocked && token) {
    return (
      <GalleryPasswordGate
        token={token}
        variant="dark"
        theme={{ ...theme, isDark: true, pageStyle: {}, bgClass: 'bg-black', surfaceClass: 'bg-white/5 border-white/10', textClass: 'text-white', mutedClass: 'text-white/70', borderClass: 'border-white/10' }}
        title={`${headerTitle || 'Gallery'} — password required`}
        onVerified={(pw) => { passwordRef.current = pw; setUnlocked(true); }}
      />
    );
  }

  // Saved direct link to a slideshow the host has switched off.
  if (isSlideshow && meta && !meta.slideshow_enabled) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0B] px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-white text-2xl md:text-3xl font-light">Live Slideshow unavailable</h1>
          <p className="text-white/70 text-sm md:text-base mt-3">
            The host has turned off the Live Slideshow for this event.
          </p>
        </div>
      </div>
    );
  }



  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0A0A0B] text-white">
      {/* Soft elegant vignette */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_65%)]" />

      {/* Persistent header: event name + date */}
      <div className="absolute top-0 left-0 right-0 z-20 px-8 pt-7 pb-14 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none flex items-start justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {theme.logoImageUrl && (
            <img src={theme.logoImageUrl} alt="" className="h-12 md:h-16 object-contain drop-shadow-lg" />
          )}
          <div className="min-w-0">
            {headerTitle && (
              <h1 className="text-white text-3xl md:text-5xl font-light tracking-[0.02em] drop-shadow-lg truncate">
                {headerTitle}
              </h1>
            )}
            {eventDateLabel && (
              <div className="mt-1.5 text-white/70 text-sm md:text-lg font-light tracking-[0.28em] uppercase">
                {eventDateLabel}
              </div>
            )}
          </div>
        </div>
        {!isSlideshow && items.length > 0 && (
          <span className="text-white/60 text-sm font-medium drop-shadow mt-1.5 shrink-0">
            {index + 1} / {items.length}
          </span>
        )}
      </div>

      {/* Stage */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {loading && (
          <div className="text-white/70 text-lg">Loading…</div>
        )}
        {!loading && error && (
          <div className="text-red-300 text-lg px-6 text-center">{error}</div>
        )}
        {!loading && !error && !current && (
          <div className="text-white/80 text-2xl md:text-4xl font-light text-center px-6">
            Waiting for guest memories…
          </div>
        )}
        {/* Outgoing layer (crossfade) */}
        {!loading && !error && prevItem && prevItem.kind === 'photo' && (
          <img
            key={`prev-${prevItem.id}`}
            src={prevItem.signed_url}
            alt=""
            aria-hidden
            className="absolute max-w-full max-h-full object-contain opacity-0 transition-opacity duration-1000"
          />
        )}
        {!loading && !error && current && (
          current.kind === 'photo' ? (
            <img
              key={current.id}
              src={current.signed_url}
              alt={current.caption || 'Guest photo'}
              className={`absolute max-w-full max-h-full object-contain ${
                settings.transition === 'none'
                  ? ''
                  : settings.transition === 'slide'
                    ? 'animate-in slide-in-from-right-10 fade-in duration-700'
                    : 'animate-in fade-in duration-1000'
              }`}
            />
          ) : (
            <video
              key={current.id}
              ref={videoRef}
              src={current.signed_url}
              autoPlay
              playsInline
              muted
              onEnded={advance}
              onError={advance}
              className={`absolute max-w-full max-h-full object-contain ${
                settings.transition === 'none'
                  ? ''
                  : settings.transition === 'slide'
                    ? 'animate-in slide-in-from-right-10 fade-in duration-700'
                    : 'animate-in fade-in duration-700'
              }`}
            />
          )
        )}
      </div>

      {/* Caption / uploader / controls */}
      {(current && (current.caption || current.uploader_name)) || items.length > 0 ? (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-8 pt-16 pb-7 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex items-end justify-between gap-4">
          <div className="pointer-events-none min-w-0">
            {settings.show_caption && current?.caption && (
              <div className="text-white text-lg md:text-2xl font-light drop-shadow-lg">
                {current.caption}
              </div>
            )}
            {settings.show_caption && (uploaderLabel || current?.uploaded_at) && (
              <div className="text-white/75 text-sm md:text-lg mt-1 font-light tracking-wide">
                {uploaderLabel}
                {uploaderLabel && current?.uploaded_at ? ' · ' : ''}
                {current?.uploaded_at
                  ? new Date(current.uploaded_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                  : ''}
              </div>
            )}
          </div>
          {!isSlideshow && items.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
              {current && (
                <button
                  onClick={handleLike}
                  disabled={likeBusy}
                  className={`h-10 px-3 rounded-full flex items-center gap-1.5 backdrop-blur-sm transition-colors ${
                    likedIds.has(current.id)
                      ? 'bg-rose-500/90 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                  }`}
                  title={likedIds.has(current.id) ? 'Remove your heart' : 'Love this photo'}
                  aria-label="Like this item"
                >
                  <Heart className={`h-4 w-4 ${likedIds.has(current.id) ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{current.like_count ?? 0}</span>
                </button>
              )}
              <button
                onClick={togglePause}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                title={isPaused ? 'Play slideshow' : 'Pause slideshow'}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      ) : null}
      {theme.showBranding && (
        <div className={`absolute bottom-4 z-20 text-[10px] md:text-xs uppercase tracking-[0.25em] text-white/35 pointer-events-none ${isSlideshow ? 'right-14' : 'right-6'}`}>
          Wedding Waitress
        </div>
      )}
      {isSlideshow && (
        <button
          type="button"
          onClick={handleExitSlideshow}
          aria-label="Exit live slideshow"
          title="Exit live slideshow"
          className="group fixed bottom-1.5 right-1.5 z-30 flex h-11 w-11 items-center justify-center bg-transparent text-[#b8a58d]/30 outline-none transition-colors duration-150 hover:text-[#d6c2a4]/60 focus-visible:text-[#ead7b8]/80 active:text-[#ead7b8]/70 motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="text-base font-light leading-none transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110 group-active:scale-95 motion-reduce:transition-none motion-reduce:transform-none">
            ×
          </span>
        </button>
      )}
    </div>
  );

};

export default GalleryLiveView;
