// Guest-facing browse gallery — shown in the "Gallery" tab of /gallery/:token
// Read-only grid of ALL approved photos & videos. Hidden / unapproved items are
// never returned by the gallery-live-feed edge function.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, X, ChevronLeft, ChevronRight, Play, Pause, Share2, Download, ImageIcon, AlertCircle, Trash2 } from 'lucide-react';
import { deleteEventMediaItems } from '@/lib/deleteEventMedia';
import { downloadSignedUrl } from '@/components/Dashboard/PhotoVideoGallery/galleryFile';
import { sharedMediaFilename } from '@/lib/sharedPhotoFilename';
import { galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import type { GalleryTheme } from '@/lib/galleryTheme';

export interface BrowseItem {
  id: string;
  kind: 'photo' | 'video';
  mime_type: string;
  uploader_name: string | null;
  caption: string | null;
  uploaded_at: string | null;
  signed_url: string;
  storage_path?: string;
  source_category?: string | null;
  share_photo_seq?: number | null;
  share_video_seq?: number | null;
}

const POLL_MS = 20 * 1000;

const fullNameOf = (n?: string | null) => (n?.trim() || 'A guest');

interface Props {
  token: string;
  theme: GalleryTheme;
  accent: string;
  /** Bumped by the parent after a successful upload to force an immediate refresh. */
  refreshKey?: number;
  /** Event name used for customer-friendly shared-photo download filenames. */
  eventName?: string | null;
}

export const GuestBrowseGallery: React.FC<Props> = ({ token, theme, accent, refreshKey = 0, eventName }) => {
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const mounted = useRef(true);
  const lightboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => { mounted.current = false; }, []);

  // Only an authenticated organiser sees the delete control (the RPC also enforces ownership).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (mounted.current) setIsAuthed(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
      // Newest memories first for browsing, with each Photo Booth session shown strip-first.
      setItems(orderBoothSessionsInPlace([...rows].reverse()));
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

  const count = items.length;
  const countLabel = useMemo(
    () => (count === 1 ? '1 memory shared' : `${count} memories shared`),
    [count],
  );

  const openAt = (i: number) => setOpenIndex(i);
  const close = useCallback(() => { setOpenIndex(null); setSlideshow(false); }, []);
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

  // Auto-advancing slideshow while the lightbox is open.
  // Photos: exactly 6s. Videos: advance only when playback finishes (see onEnded).
  useEffect(() => {
    if (!slideshow || openIndex === null || items.length < 2) return;
    if (current?.kind === 'video') return;
    const id = window.setTimeout(() => step(1), 6000);
    return () => window.clearTimeout(id);
  }, [slideshow, openIndex, items.length, step, current?.kind]);

  // True fullscreen while the slideshow is running.
  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;
    if (slideshow && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => { /* ignore */ });
    } else if (!slideshow && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => { /* ignore */ });
    }
  }, [slideshow]);

  useEffect(() => {
    const onFsChange = () => { if (!document.fullscreenElement) setSlideshow(false); };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const shareCurrent = async () => {
    if (!current) return;
    const url = current.signed_url;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Shared memory', text: current.caption || undefined, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* cancelled */ }
  };

  const downloadCurrent = () => {
    if (!current) return;
    const shared = sharedMediaFilename(current as any, eventName);
    if (shared) {
      downloadSignedUrl(current.signed_url, shared);
      return;
    }
    const ext = current.kind === 'video' ? 'mp4' : 'jpg';
    downloadSignedUrl(current.signed_url, `memory-${current.id.slice(0, 8)}.${ext}`);
  };

  const deleteCurrent = async () => {
    if (!current) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // Same authoritative deletion path as the dashboard grid (DB row + storage object).
      await deleteEventMediaItems([current.id]);
      const removedId = current.id;
      setItems(prev => {
        const next = prev.filter(i => i.id !== removedId);
        setOpenIndex(oi => {
          if (oi === null) return oi;
          if (next.length === 0) return null;
          return Math.min(oi, next.length - 1);
        });
        return next;
      });
      setConfirmDelete(false);
    } catch (e) {
      setDeleteError((e as Error).message || 'Could not delete this item.');
    } finally {
      if (mounted.current) setDeleting(false);
    }
  };




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
        <p className={`text-sm mt-1 ${theme.mutedClass}`}>Tap a photo to view it full screen</p>
      </div>

      {count === 0 ? (
        <div className={`rounded-2xl border border-dashed p-10 text-center ${theme.isDark ? 'border-white/15 bg-white/5' : 'border-[#E0D3B8] bg-white/70'}`}>
          <ImageIcon className="h-8 w-8 mx-auto mb-3" style={{ color: accent }} />
          <p className={`text-sm font-medium ${theme.textClass}`}>No memories yet</p>
          <p className={`text-xs mt-1 ${theme.mutedClass}`}>Be the first to share a photo or video.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 p-2 sm:p-3">
          {items.map((it, i) => (
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
                      src={`${it.signed_url}#t=0.1`}
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
                    alt={it.caption || 'Shared memory'}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>

      )}

      {current && createPortal(
        <div ref={lightboxRef} className="fixed inset-0 z-[100] bg-black" role="dialog" aria-modal="true">
          {/* Full-bleed media */}
          {current.kind === 'video' ? (
            <video
              key={current.id}
              src={current.signed_url}
              className="absolute inset-0 w-full h-full object-contain"
              controls={!slideshow}
              autoPlay
              playsInline
              muted={slideshow}
              onEnded={() => { if (slideshow) step(1); }}
            />
          ) : (
            <img
              key={current.id}
              src={current.signed_url}
              alt={current.caption || `Shared by ${fullNameOf(current.uploader_name)}`}
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}

          {/* Counter */}
          <span className="absolute top-3 left-4 z-20 text-white text-lg sm:text-xl font-semibold tracking-wide tabular-nums drop-shadow">
            {(openIndex ?? 0) + 1} / {items.length}
          </span>

          {/* Close */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute top-3 right-3 z-20 h-14 w-14 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Left vertical action stack */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-start gap-3">
            {[
              {
                key: 'slideshow',
                label: slideshow ? 'Pause Slideshow' : 'Play Slideshow',
                icon: slideshow ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />,
                onClick: () => setSlideshow(v => !v),
                show: true,
              },
              {
                key: 'share',
                label: 'Share',
                icon: <Share2 className="h-6 w-6" />,
                onClick: shareCurrent,
                show: true,
              },
              {
                key: 'download',
                label: 'Download',
                icon: <Download className="h-6 w-6" />,
                onClick: downloadCurrent,
                show: true,
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <Trash2 className="h-6 w-6" />,
                onClick: () => { setDeleteError(null); setConfirmDelete(true); },
                show: isAuthed,
              },
            ].filter(b => b.show).map(b => (
              <div key={b.key} className="relative group flex items-center">
                <button
                  type="button"
                  aria-label={b.label}
                  onClick={b.onClick}
                  className="h-12 w-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white"
                >
                  {b.icon}
                </button>
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md border border-white bg-transparent px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  {b.label}
                </span>
              </div>
            ))}
          </div>


          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={() => step(-1)}
                className="absolute left-1/2 bottom-6 -translate-x-[calc(50%+34px)] z-20 h-12 w-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => step(1)}
                className="absolute left-1/2 bottom-6 translate-x-[calc(-50%+34px)] z-20 h-12 w-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Caption overlay */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-5 pb-20 sm:pb-24 pt-10 text-center text-white bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
            {current.caption && <p className="text-sm mb-1.5 text-white/90">{current.caption}</p>}
            <p className="text-sm">Shared by {fullNameOf(current.uploader_name)}</p>
          </div>

          {confirmDelete && (
            <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-5">
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center">
                <p className="text-[#1D1D1F] text-base font-medium">
                  Are you sure you want to delete this photo? This cannot be undone.
                </p>
                {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="lv-premium-shade flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-60"
                  >
                    NO
                  </button>
                  <button
                    type="button"
                    onClick={deleteCurrent}
                    disabled={deleting}
                    className="lv-premium-shade flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-60"
                  >
                    {deleting ? '…' : 'YES'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default GuestBrowseGallery;
