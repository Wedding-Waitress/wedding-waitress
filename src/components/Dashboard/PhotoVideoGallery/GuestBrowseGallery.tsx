// Guest-facing browse gallery — shown in the "Gallery" tab of /gallery/:token
// Read-only grid of ALL approved photos & videos, with device-based hearts
// and a fullscreen lightbox. Hidden / unapproved items are never returned by
// the gallery-live-feed edge function.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Heart, X, ChevronLeft, ChevronRight, Play, ImageIcon, AlertCircle } from 'lucide-react';
import { fetchLikedItemIds, toggleGalleryLike } from '@/lib/galleryLikes';
import { galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import type { ResolvedGalleryTheme } from '@/lib/galleryTheme';

export interface BrowseItem {
  id: string;
  kind: 'photo' | 'video';
  mime_type: string;
  uploader_name: string | null;
  caption: string | null;
  uploaded_at: string | null;
  signed_url: string;
  like_count?: number | null;
}

const POLL_MS = 20 * 1000;

const firstNameOf = (n?: string | null) => (n?.trim().split(/\s+/)[0] || 'A guest');

interface Props {
  token: string;
  theme: ResolvedGalleryTheme;
  accent: string;
  /** Bumped by the parent after a successful upload to force an immediate refresh. */
  refreshKey?: number;
}

export const GuestBrowseGallery: React.FC<Props> = ({ token, theme, accent, refreshKey = 0 }) => {
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const body: Record<string, string> = { token };
      try {
        const pw = sessionStorage.getItem(galleryPasswordKey(token));
        if (pw) body.password = pw;
      } catch { /* ignore */ }
      const { data, error: err } = await supabase.functions.invoke('gallery-live-feed', { body });
      if (err) throw new Error(err.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const rows = (((data as any)?.items || []) as BrowseItem[]);
      if (!mounted.current) return;
      // Newest memories first for browsing.
      setItems([...rows].reverse());
      setError(null);
    } catch (e) {
      if (mounted.current && showSpinner) setError((e as Error).message || 'Could not load the gallery');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(true); }, [load, refreshKey]);

  useEffect(() => {
    const id = window.setInterval(() => load(false), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    let active = true;
    fetchLikedItemIds(token)
      .then(s => { if (active) setLikedIds(s); })
      .catch(() => {});
    return () => { active = false; };
  }, [token]);

  const onToggleLike = useCallback(async (itemId: string) => {
    if (busyId) return;
    setBusyId(itemId);
    try {
      const res = await toggleGalleryLike(token, itemId);
      setLikedIds(prev => {
        const next = new Set(prev);
        if (res.liked) next.add(itemId); else next.delete(itemId);
        return next;
      });
      setItems(prev => prev.map(i => (i.id === itemId ? { ...i, like_count: res.like_count } : i)));
    } catch { /* best-effort */ } finally {
      setBusyId(null);
    }
  }, [busyId, token]);

  const count = items.length;
  const countLabel = useMemo(
    () => (count === 1 ? '1 memory shared' : `${count} memories shared`),
    [count],
  );

  const openAt = (i: number) => setOpenIndex(i);
  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback((dir: 1 | -1) => {
    setOpenIndex(prev => {
      if (prev === null || items.length === 0) return prev;
      return (prev + dir + items.length) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex, close, step]);

  const current = openIndex !== null ? items[openIndex] : null;

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border p-6 text-center text-sm ${theme.isDark ? 'border-white/15 bg-white/5' : 'border-[#E8E1D6] bg-white/80'} ${theme.mutedClass}`}>
        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-5">
        <p className={`text-sm font-medium tracking-wide ${theme.textClass}`}>{countLabel}</p>
        <p className={`text-xs mt-1 ${theme.mutedClass}`}>Tap a photo to view it full screen</p>
      </div>

      {count === 0 ? (
        <div className={`rounded-2xl border border-dashed p-10 text-center ${theme.isDark ? 'border-white/15 bg-white/5' : 'border-[#E0D3B8] bg-white/70'}`}>
          <ImageIcon className="h-8 w-8 mx-auto mb-3" style={{ color: accent }} />
          <p className={`text-sm font-medium ${theme.textClass}`}>No memories yet</p>
          <p className={`text-xs mt-1 ${theme.mutedClass}`}>Be the first to share a photo or video.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {items.map((it, i) => {
            const liked = likedIds.has(it.id);
            return (
              <li key={it.id} className="min-w-0">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openAt(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(i); } }}
                  className={`relative aspect-square w-full overflow-hidden rounded-xl border cursor-pointer group ${theme.isDark ? 'border-white/10 bg-white/5' : 'border-[#E8E1D6] bg-[#F6F1E9]'}`}
                >
                  {it.kind === 'video' ? (
                    <>
                      <video
                        src={it.signed_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Play className="h-7 w-7 text-white" fill="white" />
                      </span>
                    </>
                  ) : (
                    <img
                      src={it.signed_url}
                      alt={it.caption || `Shared by ${firstNameOf(it.uploader_name)}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  )}

                  <button
                    type="button"
                    aria-label={liked ? 'Remove your like' : 'Like this memory'}
                    onClick={(e) => { e.stopPropagation(); onToggleLike(it.id); }}
                    disabled={busyId === it.id}
                    className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-sm px-2 py-1 text-[11px] text-white"
                  >
                    <Heart
                      className="h-3.5 w-3.5"
                      style={liked ? { color: '#F26D7D' } : undefined}
                      fill={liked ? '#F26D7D' : 'transparent'}
                    />
                    {(it.like_count ?? 0) > 0 && <span>{it.like_count}</span>}
                  </button>
                </div>
                <p className={`mt-1.5 text-[11px] text-center truncate ${theme.mutedClass}`}>
                  {firstNameOf(it.uploader_name)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {current && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 py-3 text-white/90">
            <span className="text-xs tracking-wide">
              {(openIndex ?? 0) + 1} / {items.length}
            </span>
            <button type="button" aria-label="Close" onClick={close} className="p-2 -m-2 text-white/80 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 relative flex items-center justify-center px-2 min-h-0">
            {items.length > 1 && (
              <button
                type="button"
                aria-label="Previous"
                onClick={() => step(-1)}
                className="absolute left-2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {current.kind === 'video' ? (
              <video
                key={current.id}
                src={current.signed_url}
                className="max-h-full max-w-full object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                key={current.id}
                src={current.signed_url}
                alt={current.caption || `Shared by ${firstNameOf(current.uploader_name)}`}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {items.length > 1 && (
              <button
                type="button"
                aria-label="Next"
                onClick={() => step(1)}
                className="absolute right-2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="px-5 py-5 text-center text-white">
            {current.caption && <p className="text-sm mb-1.5 text-white/90">{current.caption}</p>}
            <p className="text-sm">Shared by {firstNameOf(current.uploader_name)}</p>
            <button
              type="button"
              onClick={() => onToggleLike(current.id)}
              disabled={busyId === current.id}
              aria-label={likedIds.has(current.id) ? 'Remove your like' : 'Like this memory'}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm"
            >
              <Heart
                className="h-4 w-4"
                style={likedIds.has(current.id) ? { color: '#F26D7D' } : undefined}
                fill={likedIds.has(current.id) ? '#F26D7D' : 'transparent'}
              />
              {current.like_count ?? 0}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default GuestBrowseGallery;
