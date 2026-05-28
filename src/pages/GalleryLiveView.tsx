import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize, Minimize, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveMeta {
  gallery_id: string;
  event_id: string;
  event_name: string | null;
  partner1_name: string | null;
  partner2_name: string | null;
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

const PHOTO_INTERVAL_MS = 8000;
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoTimerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const isPausedRef = useRef(isPaused);
  const pendingAdvanceRef = useRef(false);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const headerTitle = useMemo(() => {
    if (!meta) return '';
    const couple = [meta.partner1_name, meta.partner2_name].filter(Boolean).join(' & ');
    return couple || meta.event_name || '';
  }, [meta]);

  useEffect(() => {
    document.title = headerTitle ? `${headerTitle} — Live Gallery` : 'Live Gallery';
  }, [headerTitle]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const loadItems = useCallback(async (t: string) => {
    const { data, error: err } = await supabase.functions.invoke('gallery-live-feed', {
      body: { token: t },
    });
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
        setMeta({
          gallery_id: row.gallery_id,
          event_id: row.event_id,
          event_name: row.event_name,
          partner1_name: row.partner1_name,
          partner2_name: row.partner2_name,
        });
        await loadItems(token);
      } catch (e: any) {
        if (active) setError(e?.message || 'Unable to load gallery');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

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
      photoTimerRef.current = window.setTimeout(advance, PHOTO_INTERVAL_MS);
    }
    return () => {
      if (photoTimerRef.current) {
        window.clearTimeout(photoTimerRef.current);
        photoTimerRef.current = null;
      }
    };
  }, [index, items, advance, isPaused]);

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

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Header */}
      {headerTitle && (
        <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <h1 className="text-white text-2xl md:text-3xl font-light tracking-wide drop-shadow-lg">
            {headerTitle}
          </h1>
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

      {/* Caption / uploader */}
      {current && (current.caption || current.uploader_name) && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          {current.caption && (
            <div className="text-white text-lg md:text-2xl font-light drop-shadow-lg">
              {current.caption}
            </div>
          )}
          {current.uploader_name && (
            <div className="text-white/70 text-sm md:text-base mt-1">
              — {current.uploader_name}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GalleryLiveView;
