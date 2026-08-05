// Square thumbnail renderer for the dashboard gallery grid.
// Loads media only once the tile scrolls into view, retries once on failure,
// and never shows a false "unavailable" state just because a large original
// is still downloading.
import React, { useEffect, useRef, useState } from 'react';
import { Play, FileImage, FileVideo, Mic, TriangleAlert, LoaderCircle } from 'lucide-react';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

type Status = 'idle' | 'loading' | 'ready' | 'error';

const useInView = <T extends HTMLElement>(rootMargin = '300px') => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
};

export const MediaThumb: React.FC<{ item: GalleryItem; onOpen: () => void }> = ({ item, onOpen }) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setStatus('idle'); setAttempt(0); }, [item.signed_url, item.id]);

  const src = item.signed_url
    ? attempt === 0
      ? item.signed_url
      : `${item.signed_url}${item.signed_url.includes('?') ? '&' : '?'}r=${attempt}`
    : undefined;

  const handleError = () => {
    // One silent retry (transient network / aborted range request) before failing.
    if (attempt === 0) { setAttempt(1); setStatus('loading'); return; }
    setStatus('error');
  };

  const Fallback = ({ label, warn }: { label: string; warn?: boolean }) => (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted text-center p-2 cursor-pointer"
      onClick={onOpen}
    >
      {item.kind === 'video' ? (
        <FileVideo className="h-7 w-7 text-muted-foreground" />
      ) : item.kind === 'audio' ? (
        <Mic className="h-7 w-7 text-muted-foreground" />
      ) : (
        <FileImage className="h-7 w-7 text-muted-foreground" />
      )}
      <span className={`text-[10px] ${warn ? 'text-amber-600' : 'text-muted-foreground'} flex items-center gap-1`}>
        {warn && <TriangleAlert className="h-3 w-3" />} {label}
      </span>
    </div>
  );

  return (
    <div ref={ref} className="absolute inset-0 bg-muted">
      {!item.signed_url ? (
        <Fallback label="Preview unavailable" warn />
      ) : item.kind === 'audio' ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#967A59]/10 to-[#967A59]/30 cursor-pointer"
          onClick={onOpen}
        >
          <div className="w-12 h-12 rounded-full bg-[#967A59] flex items-center justify-center">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
          <span className="text-[10px] uppercase tracking-wide text-[#967A59] mt-1.5">Voice</span>
        </div>
      ) : item.kind === 'photo' ? (
        <>
          {inView && (
            <img
              key={attempt}
              src={src}
              alt={item.caption || item.uploader_name || 'Guest upload'}
              decoding="async"
              className={`absolute inset-0 w-full h-full object-cover cursor-zoom-in transition-opacity duration-200 ${
                status === 'ready' ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={onOpen}
              onLoadStart={() => setStatus(s => (s === 'ready' ? s : 'loading'))}
              onLoad={() => setStatus('ready')}
              onError={handleError}
            />
          )}
          {status !== 'ready' && status !== 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {status === 'error' && <Fallback label="Preview unavailable" warn />}
        </>
      ) : (
        <div className="absolute inset-0 cursor-pointer" onClick={onOpen}>
          {inView && status !== 'error' && (
            <video
              key={attempt}
              src={src}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                status === 'ready' ? 'opacity-100' : 'opacity-0'
              }`}
              preload="metadata"
              muted
              playsInline
              onLoadedMetadata={() => setStatus('ready')}
              onLoadedData={() => setStatus('ready')}
              onError={handleError}
            />
          )}
          {status === 'error' && (
            // Container/codec the browser can't decode (e.g. .mov) — still openable.
            <div className="absolute inset-0 bg-gradient-to-br from-[#2b2b2e] to-[#4a4a4f]" />
          )}
          {status !== 'ready' && status !== 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
            <span className="w-11 h-11 rounded-full bg-black/55 flex items-center justify-center">
              <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaThumb;
