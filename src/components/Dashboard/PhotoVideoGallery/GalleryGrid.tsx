import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Download, Trash2, Play, Camera } from 'lucide-react';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

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
          <div key={it.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
            {it.kind === 'photo' && it.signed_url ? (
              <img src={it.signed_url} alt={it.caption || ''} loading="lazy" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLightbox(it)} />
            ) : it.kind === 'video' && it.signed_url ? (
              <div className="w-full h-full relative cursor-pointer" onClick={() => setLightbox(it)}>
                <video src={it.signed_url} className="w-full h-full object-cover" preload="metadata" muted />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-10 w-10 text-white" fill="white" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
            )}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {it.signed_url && (
                <a href={it.signed_url} download className="bg-white/90 rounded-md p-1.5 hover:bg-white">
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
              <button onClick={() => { if (confirm('Delete this upload?')) onDelete(it.id); }} className="bg-white/90 rounded-md p-1.5 hover:bg-white text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {it.uploader_name && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">{it.uploader_name}</div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
            {lightbox.kind === 'photo' ? (
              <img src={lightbox.signed_url} alt="" className="max-h-[85vh] max-w-full" />
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
                <a href={lightbox.signed_url} download>
                  <Button className="lv-premium-shade" variant="outline"><Download className="h-4 w-4 mr-1" /> Download</Button>
                </a>
              )}
              <Button className="lv-premium-shade" variant="outline" onClick={() => setLightbox(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
