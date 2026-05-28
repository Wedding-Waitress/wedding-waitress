import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Download, Trash2, Play, Camera, AlertTriangle, FileVideo, FileImage, ExternalLink } from 'lucide-react';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

const PREVIEW_TIMEOUT_MS = 10000;

const MediaThumb: React.FC<{ item: GalleryItem; onOpen: () => void }> = ({ item, onOpen }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatus('loading');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!item.signed_url) {
      // No URL yet — wait the timeout window, then fail
      timerRef.current = setTimeout(() => setStatus('error'), PREVIEW_TIMEOUT_MS);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
    timerRef.current = setTimeout(() => {
      setStatus(prev => (prev === 'loading' ? 'error' : prev));
    }, PREVIEW_TIMEOUT_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [item.signed_url, item.id]);

  const onLoaded = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('ready');
  };
  const onErr = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('error');
  };

  if (status === 'error' || !item.signed_url) {
    const Icon = item.kind === 'video' ? FileVideo : FileImage;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground mb-1" />
        <div className="text-[11px] font-medium uppercase text-muted-foreground">{item.kind}</div>
        {item.uploader_name && (
          <div className="text-[11px] text-muted-foreground truncate max-w-full">by {item.uploader_name}</div>
        )}
        <div className="flex items-center gap-1 mt-1 text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-[10px]">Preview unavailable</span>
        </div>
      </div>
    );
  }

  if (item.kind === 'photo') {
    return (
      <img
        src={item.signed_url}
        alt={item.caption || ''}
        loading="lazy"
        className="w-full h-full object-cover cursor-zoom-in"
        onClick={onOpen}
        onLoad={onLoaded}
        onError={onErr}
      />
    );
  }
  return (
    <div className="w-full h-full relative cursor-pointer" onClick={onOpen}>
      <video
        src={item.signed_url}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        onLoadedMetadata={onLoaded}
        onLoadedData={onLoaded}
        onError={onErr}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
        <Play className="h-10 w-10 text-white" fill="white" />
      </div>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80 bg-black/40">
          Loading…
        </div>
      )}
    </div>
  );
};

async function downloadSignedUrl(url: string, filenameHint: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filenameHint || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function filenameFor(item: GalleryItem): string {
  const ext = (item.storage_path.split('.').pop() || (item.kind === 'video' ? 'mp4' : 'jpg')).split('?')[0];
  const who = (item.uploader_name || 'guest').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'guest';
  return `${who}-${item.id.slice(0, 8)}.${ext}`;
}

export const GalleryGrid: React.FC<{
  items: GalleryItem[];
  onDelete: (id: string) => void;
}> = ({ items, onDelete }) => {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No uploads yet — share the QR code with your guests.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-[#1D1D1F] mb-4">Guest uploads ({items.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map(it => (
          <div key={it.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted flex flex-col">
            <div className="aspect-square relative">
              <MediaThumb item={it} onOpen={() => it.signed_url && setLightbox(it)} />
              <div className="absolute top-1 right-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                {it.signed_url && (
                  <button
                    onClick={() => window.open(it.signed_url!, '_blank', 'noopener,noreferrer')}
                    className="bg-white/90 rounded-md p-1.5 hover:bg-white"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
                {it.signed_url && (
                  <button
                    onClick={() => downloadSignedUrl(it.signed_url!, filenameFor(it))}
                    className="bg-white/90 rounded-md p-1.5 hover:bg-white"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { if (confirm('Delete this upload? This also removes the file from storage.')) onDelete(it.id); }}
                  className="bg-white/90 rounded-md p-1.5 hover:bg-white text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="px-2 py-1.5 bg-white border-t border-border text-xs">
              <div className="font-medium text-[#1D1D1F] truncate">{it.uploader_name || 'Anonymous guest'}</div>
              {it.caption && (
                <div className="text-muted-foreground line-clamp-2 mt-0.5" title={it.caption}>{it.caption}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
            {lightbox.kind === 'photo' ? (
              <img src={lightbox.signed_url} alt={lightbox.caption || ''} className="max-h-[85vh] max-w-full" />
            ) : (
              <video src={lightbox.signed_url} controls autoPlay className="max-h-[85vh] max-w-full" />
            )}
            {(lightbox.caption || lightbox.uploader_name) && (
              <div className="text-white text-center mt-3 text-sm">
                {lightbox.uploader_name && <strong className="mr-2">{lightbox.uploader_name}</strong>}
                {lightbox.caption}
              </div>
            )}
            <div className="flex justify-center gap-3 mt-4">
              {lightbox.signed_url && (
                <Button
                  className="lv-premium-shade"
                  variant="outline"
                  onClick={() => downloadSignedUrl(lightbox.signed_url!, filenameFor(lightbox))}
                >
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              )}
              <Button className="lv-premium-shade" variant="outline" onClick={() => setLightbox(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

