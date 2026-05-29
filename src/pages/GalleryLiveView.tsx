import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize, Minimize, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GalleryPasswordGate, galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import { resolveGalleryTheme } from '@/lib/galleryTheme';

interface LiveMeta {
  gallery_id: string;
  event_id: string;
  event_name: string | null;
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
  signed_url: string;
}

const DEFAULT_PHOTO_INTERVAL_SEC = 8;
// Re-fetch signed URLs before they expire (edge function TTL = 600s).
const REFRESH_URLS_MS = 8 * 60 * 1000;

const GalleryLiveView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<LiveMeta | null>(null);
  const [items, setItems] = useState<LiveItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
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

  const headerTitle = useMemo(() => {
    if (!meta) return '';
    if (meta.gallery_title?.trim()) return meta.gallery_title.trim();
    const couple = [meta.partner1_name, meta.partner2_name].filter(Boolean).join(' & ');
    return couple || meta.event_name || '';
  }, [meta]);

  const photoIntervalMs = useMemo(() => {
    const s = meta?.slideshow_photo_duration_sec ?? DEFAULT_PHOTO_INTERVAL_SEC;
    return Math.max(3, Math.min(60, s)) * 1000;
  }, [meta?.slideshow_photo_duration_sec]);

  useEffect(() => {
    document.title = headerTitle ? `${headerTitle} — Live Gallery` : 'Live Gallery';
  }, [headerTitle]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

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
    const refresh = window.setInterval(() => { loadItems(token).catch(() => {}); }, REFRESH_URLS_MS);
    return () => { supabase.removeChannel(channel); window.clearInterval(refresh); };
  }, [meta?.event_id, token, loadItems]);

  // Advance helper (respects pause)
  const advance = useCallback(() => {
    if (isPausedRef.current) {
      pendingAdvanceRef.current = true;
      return;
    }
    pendingAdvanceRef.current = false;
    setIndex(i => (items.length === 0 ? 0 : (i + 1) % items.length));
  }, [items.length]);

  // Photo auto-advance timer; videos advance on `ended`
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

  if (meta?.password_required && !unlocked && token) {
    return (
      <GalleryPasswordGate
        token={token}
        variant="dark"
        title={`${headerTitle || 'Gallery'} — password required`}
        onVerified={(pw) => { passwordRef.current = pw; setUnlocked(true); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Header */}
      {headerTitle && (
        <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none flex items-start justify-between">
          <h1 className="text-white text-2xl md:text-3xl font-light tracking-wide drop-shadow-lg">
            {headerTitle}
          </h1>
          {items.length > 0 && (
            <span className="text-white/60 text-sm font-medium drop-shadow mt-1.5 shrink-0">
              {index + 1} / {items.length}
            </span>
          )}
        </div>
      )}

      {/* Stage */}
      <div className="absolute inset-0 flex items-center justify-center">
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
        {!loading && !error && current && (
          current.kind === 'photo' ? (
            <img
              key={current.id}
              src={current.signed_url}
              alt={current.caption || 'Guest photo'}
              className="max-w-full max-h-full object-contain animate-in fade-in duration-700"
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
              className="max-w-full max-h-full object-contain"
            />
          )
        )}
      </div>

      {/* Caption / uploader / controls */}
      {(current && (current.caption || current.uploader_name)) || items.length > 0 ? (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-5 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between gap-4">
          <div className="pointer-events-none min-w-0">
            {current?.caption && (
              <div className="text-white text-lg md:text-2xl font-light drop-shadow-lg">
                {current.caption}
              </div>
            )}
            {current?.uploader_name && (
              <div className="text-white/70 text-sm md:text-base mt-1">
                — {current.uploader_name}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
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
    </div>
  );
};

export default GalleryLiveView;
