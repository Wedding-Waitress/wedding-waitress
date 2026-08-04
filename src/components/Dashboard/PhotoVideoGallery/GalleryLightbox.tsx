// Full-screen lightbox viewer for the dashboard Photo & Video Sharing.
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, Share2, Info } from 'lucide-react';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { downloadSignedUrl, filenameFor } from './galleryFile';
import { useToast } from '@/hooks/use-toast';

interface Props {
  items: GalleryItem[];      // navigable list (approved only)
  eventName?: string | null;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const GalleryLightbox: React.FC<Props> = ({ items, eventName, index, onIndexChange, onClose }) => {
  const [showInfo, setShowInfo] = useState(false);
  const { toast } = useToast();
  const item = items[index];

  const go = useCallback((delta: number) => {
    if (items.length === 0) return;
    onIndexChange((index + delta + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  if (!item) return null;

  const share = async () => {
    const url = item.signed_url;
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.uploader_name || 'Guest upload', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied', description: 'Temporary secure link copied to clipboard.' });
      }
    } catch {
      /* user cancelled */
    }
  };

  const typeBadge = item.is_photo_booth_strip
    ? 'Photo Booth Strip'
    : item.is_photo_booth
      ? 'Photo Booth'
      : item.is_guestbook
        ? 'Guestbook'
        : item.kind === 'video' ? 'Video' : item.kind === 'audio' ? 'Voice' : 'Photo';

  const iconBtn = 'rounded-full bg-white/10 hover:bg-white/20 text-white p-2.5 transition-colors backdrop-blur-sm';

  // Image is sized against the full viewport minus a small safety gap.
  const mediaStyle: React.CSSProperties = {
    maxHeight: 'calc(100dvh - 40px)',
    maxWidth: 'calc(100vw - 24px)',
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black" onClick={onClose}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-2 p-3 sm:p-4" onClick={e => e.stopPropagation()}>
        <div className="rounded-full bg-white/10 backdrop-blur-sm text-white text-sm sm:text-base font-medium px-4 py-2 min-w-[4.25rem] text-center tabular-nums select-none">
          {index + 1} / {items.length}
        </div>
        <div className="flex items-center gap-2">

          {item.signed_url && (
            <button type="button" className={iconBtn} title="Download" aria-label="Download"
              onClick={() => downloadSignedUrl(item.signed_url!, filenameFor(item, eventName))}>
              <Download className="h-5 w-5" />
            </button>
          )}
          {item.signed_url && (
            <button type="button" className={iconBtn} title="Share" aria-label="Share" onClick={share}>
              <Share2 className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            className={`${iconBtn} ${showInfo ? 'bg-white/25' : ''}`}
            title="Info"
            aria-label="Info"
            onClick={() => setShowInfo(v => !v)}
          >
            <Info className="h-5 w-5" />
          </button>
          <button type="button" className={iconBtn} title="Close" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stage — image fills the viewport minus a small safety gap */}
      <div className="absolute inset-0 flex items-center justify-center">
        {items.length > 1 && (
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-1 sm:left-4 z-30 rounded-full bg-white/10 hover:bg-white/25 text-white p-2 sm:p-3 backdrop-blur-sm"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
          {item.kind === 'photo' ? (
            <img
              src={item.signed_url}
              alt={item.caption || item.uploader_name || 'Guest upload'}
              style={mediaStyle}
              className="w-auto h-auto object-contain"
            />
          ) : item.kind === 'audio' ? (
            <div className="bg-white rounded-2xl p-6 w-[min(90vw,420px)]">
              <audio src={item.signed_url} controls autoPlay className="w-full" />
            </div>
          ) : (
            <video
              key={item.id}
              src={item.signed_url}
              controls
              autoPlay
              playsInline
              style={mediaStyle}
              className="w-auto h-auto object-contain bg-black"
            />
          )}
        </div>

        {items.length > 1 && (
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-1 sm:right-4 z-30 rounded-full bg-white/10 hover:bg-white/25 text-white p-2 sm:p-3 backdrop-blur-sm"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom caption + info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 text-center text-white/80 pointer-events-none [&_*]:pointer-events-auto" onClick={e => e.stopPropagation()}>

        <div className="text-sm">
          <strong className="text-white">{item.uploader_name || 'Anonymous guest'}</strong>
          {item.caption ? <span className="ml-2">{item.caption}</span> : null}
          <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white align-middle">
            <span aria-hidden>❤️</span>
            <span>{item.like_count ?? 0}</span>
          </span>
        </div>
        {showInfo && (
          <div className="mt-3 mx-auto max-w-md rounded-xl bg-white/10 backdrop-blur-sm p-4 text-left text-sm space-y-1.5">
            <div className="flex justify-between gap-4"><span className="text-white/60">Uploader</span><span className="text-white text-right">{item.uploader_name || 'Anonymous guest'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/60">Uploaded</span><span className="text-white text-right">{fmtDate(item.uploaded_at)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/60">Guest hearts</span><span className="text-white text-right">{item.like_count ?? 0}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/60">Album</span><span className="text-white text-right">{item.album || 'No album'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-white/60">Type</span>
              <span className="text-right">
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-white/20 text-white">{typeBadge}</span>
              </span>
            </div>
            {item.guestbook_message && (
              <div className="pt-1 text-white/80 italic">“{item.guestbook_message}”</div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default GalleryLightbox;
