import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Trash2, Play, Camera, AlertTriangle, FileVideo, FileImage, ExternalLink, EyeOff, Eye, CheckCircle2, Circle, X, Search, FolderOpen } from 'lucide-react';
import type { GalleryItem, GalleryAlbum } from '@/hooks/useEventMediaGallery';
import { GALLERY_ALBUMS } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


const PREVIEW_TIMEOUT_MS = 10000;

const MediaThumb: React.FC<{ item: GalleryItem; onOpen: () => void }> = ({ item, onOpen }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatus('loading');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!item.signed_url) {
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
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function filenameFor(item: GalleryItem): string {
  const ext = (item.storage_path.split('.').pop() || (item.kind === 'video' ? 'mp4' : 'jpg')).split('?')[0];
  const who = (item.uploader_name || 'guest').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'guest';
  return `${who}-${item.id.slice(0, 8)}.${ext}`;
}

type Filter = 'all' | 'approved' | 'hidden';
type MediaTypeFilter = 'all' | 'photos' | 'videos';
type SortMode = 'newest' | 'oldest';

export const GalleryGrid: React.FC<{
  items: GalleryItem[];
  onDelete: (id: string) => void;
  onSetModeration: (id: string, status: 'approved' | 'hidden') => Promise<void>;
}> = ({ items, onDelete, onSetModeration }) => {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [mediaType, setMediaType] = useState<MediaTypeFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  // Apply search + media type first; moderation counts reflect this subset.
  const searchedTyped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (mediaType === 'photos' && i.kind !== 'photo') return false;
      if (mediaType === 'videos' && i.kind !== 'video') return false;
      if (q) {
        const hay = `${i.uploader_name || ''} ${i.caption || ''} ${i.guestbook_message || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, mediaType, search]);

  const counts = useMemo(() => {
    const approved = searchedTyped.filter(i => i.moderation_status === 'approved').length;
    const hidden = searchedTyped.filter(i => i.moderation_status === 'hidden').length;
    return { all: searchedTyped.length, approved, hidden };
  }, [searchedTyped]);

  const filtered = useMemo(() => {
    const base = filter === 'all' ? searchedTyped : searchedTyped.filter(i => i.moderation_status === filter);
    const sorted = [...base].sort((a, b) => {
      const ta = a.uploaded_at ? Date.parse(a.uploaded_at) : 0;
      const tb = b.uploaded_at ? Date.parse(b.uploaded_at) : 0;
      return sortMode === 'newest' ? tb - ta : ta - tb;
    });
    return sorted;
  }, [searchedTyped, filter, sortMode]);

  // Clean up selection when items change (deleted items)
  useEffect(() => {
    setSelected(prev => {
      const valid = new Set(items.map(i => i.id));
      const next = new Set<string>();
      prev.forEach(id => { if (valid.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visibleIds = useMemo(() => filtered.map(i => i.id), [filtered]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));

  const selectAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleModeration = async (it: GalleryItem) => {
    const next = it.moderation_status === 'approved' ? 'hidden' : 'approved';
    try {
      await onSetModeration(it.id, next);
      toast({ title: next === 'hidden' ? 'Item hidden' : 'Item approved' });
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message, variant: 'destructive' });
    }
  };

  // Bulk actions only act on items that are BOTH selected AND currently visible.
  const selectedItems = useMemo(
    () => filtered.filter(i => selected.has(i.id)),
    [filtered, selected]
  );
  const visibleSelectedCount = selectedItems.length;

  const bulkSetModeration = async (status: 'approved' | 'hidden') => {
    if (selectedItems.length === 0) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const it of selectedItems) {
      if (it.moderation_status === status) { ok++; continue; }
      try { await onSetModeration(it.id, status); ok++; } catch { fail++; }
    }
    setBulkBusy(false);
    toast({
      title: status === 'approved' ? `Approved ${ok} item${ok === 1 ? '' : 's'}` : `Hid ${ok} item${ok === 1 ? '' : 's'}`,
      description: fail > 0 ? `${fail} failed` : undefined,
      variant: fail > 0 ? 'destructive' : undefined,
    });
  };

  const bulkDelete = async () => {
    setConfirmDelete(false);
    if (selectedItems.length === 0) return;
    setBulkBusy(true);
    const ids = selectedItems.map(i => i.id);
    for (const id of ids) {
      try { await onDelete(id); } catch { /* hook may throw; continue */ }
    }
    setBulkBusy(false);
    toast({ title: `Deleted ${ids.length} item${ids.length === 1 ? '' : 's'}` });
    exitSelectMode();
  };

  const bulkDownload = async () => {
    const withUrl = selectedItems.filter(i => i.signed_url);
    if (withUrl.length === 0) {
      toast({ title: 'Nothing to download', description: 'Selected items have no preview URLs yet.', variant: 'destructive' });
      return;
    }
    setBulkBusy(true);
    toast({ title: `Downloading ${withUrl.length} file${withUrl.length === 1 ? '' : 's'}…` });
    for (let i = 0; i < withUrl.length; i++) {
      const it = withUrl[i];
      // sequential, one-by-one, small gap so browser doesn't drop downloads
      // eslint-disable-next-line no-await-in-loop
      await downloadSignedUrl(it.signed_url!, filenameFor(it));
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 350));
    }
    setBulkBusy(false);
  };

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No uploads yet — share the QR code with your guests.</p>
      </Card>
    );
  }

  const FilterBtn = ({ value, label, count }: { value: Filter; label: string; count: number }) => (
    <button
      onClick={() => setFilter(value)}
      className={`lv-premium-shade px-3 h-9 rounded-md text-sm border transition-colors ${
        filter === value
          ? 'bg-[#967A59] text-white border-[#967A59]'
          : 'bg-white text-[#1D1D1F] border-border hover:bg-muted'
      }`}
      type="button"
    >
      {label} <span className="opacity-75">({count})</span>
    </button>
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-lg font-semibold text-[#1D1D1F]">Guest uploads ({items.length})</h2>
        <div className="flex gap-2 flex-wrap">
          {!selectMode ? (
            <Button
              className="lv-premium-shade"
              variant="outline"
              size="sm"
              onClick={() => setSelectMode(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Select
            </Button>
          ) : (
            <Button
              className="lv-premium-shade"
              variant="outline"
              size="sm"
              onClick={exitSelectMode}
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Search + type + sort */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 mb-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search uploader, caption or message…"
            className="h-9 pl-9"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={mediaType} onValueChange={(v) => setMediaType(v as MediaTypeFilter)}>
          <SelectTrigger className="h-9 md:w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All media</SelectItem>
            <SelectItem value="photos">Photos</SelectItem>
            <SelectItem value="videos">Videos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="h-9 md:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Moderation pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        <FilterBtn value="all" label="All" count={counts.all} />
        <FilterBtn value="approved" label="Approved" count={counts.approved} />
        <FilterBtn value="hidden" label="Hidden" count={counts.hidden} />
      </div>

      {selectMode && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4 p-3 rounded-md border border-border bg-muted/40">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={selectAllVisible}
              className="lv-premium-shade px-3 h-9 rounded-md text-sm border bg-white text-[#1D1D1F] border-border hover:bg-muted"
            >
              {allVisibleSelected ? 'Clear visible' : `Select all visible (${visibleIds.length})`}
            </button>
            <span className="text-sm text-muted-foreground">
              {visibleSelectedCount} selected{selected.size > visibleSelectedCount ? ` (${selected.size - visibleSelectedCount} hidden by filters)` : ''}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              className="lv-premium-shade"
              variant="outline"
              size="sm"
              disabled={bulkBusy || visibleSelectedCount === 0}
              onClick={() => bulkSetModeration('approved')}
            >
              <Eye className="h-4 w-4 mr-1 text-green-600" /> Approve
            </Button>
            <Button
              className="lv-premium-shade"
              variant="outline"
              size="sm"
              disabled={bulkBusy || visibleSelectedCount === 0}
              onClick={() => bulkSetModeration('hidden')}
            >
              <EyeOff className="h-4 w-4 mr-1 text-amber-600" /> Hide
            </Button>
            <Button
              className="lv-premium-shade"
              variant="outline"
              size="sm"
              disabled={bulkBusy || visibleSelectedCount === 0}
              onClick={bulkDownload}
            >
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
            <Button
              className="lv-premium-shade"
              variant="destructive"
              size="sm"
              disabled={bulkBusy || visibleSelectedCount === 0}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No items in this view.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(it => {
            const isHidden = it.moderation_status === 'hidden';
            const isSelected = selected.has(it.id);
            return (
              <div
                key={it.id}
                className={`relative group rounded-lg overflow-hidden border bg-muted flex flex-col ${
                  isSelected ? 'border-[#967A59] ring-2 ring-[#967A59]' : 'border-border'
                } ${isHidden ? 'opacity-60' : ''}`}
              >
                <div className="aspect-square relative">
                  <MediaThumb
                    item={it}
                    onOpen={() => {
                      if (selectMode) { toggleOne(it.id); return; }
                      if (it.signed_url) setLightbox(it);
                    }}
                  />
                  {selectMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleOne(it.id); }}
                      className="absolute inset-0 z-20 flex items-start justify-start p-2 bg-black/0 hover:bg-black/10 transition-colors"
                      aria-label={isSelected ? 'Deselect' : 'Select'}
                    >
                      <span className={`rounded-full p-0.5 ${isSelected ? 'bg-[#967A59] text-white' : 'bg-white/90 text-[#1D1D1F]'}`}>
                        {isSelected ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                      </span>
                    </button>
                  )}
                  {isHidden && (
                    <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Hidden
                    </div>
                  )}
                  {!selectMode && (
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
                        onClick={() => toggleModeration(it)}
                        className="bg-white/90 rounded-md p-1.5 hover:bg-white"
                        title={isHidden ? 'Approve / show again' : 'Hide from guests'}
                      >
                        {isHidden ? <Eye className="h-3.5 w-3.5 text-green-600" /> : <EyeOff className="h-3.5 w-3.5 text-amber-600" />}
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this upload? This also removes the file from storage.')) onDelete(it.id); }}
                        className="bg-white/90 rounded-md p-1.5 hover:bg-white text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5 bg-white border-t border-border text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-[#1D1D1F] truncate">{it.uploader_name || 'Anonymous guest'}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${
                      isHidden ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {isHidden ? 'Hidden' : 'Approved'}
                    </span>
                  </div>
                  {it.caption && (
                    <div className="text-muted-foreground line-clamp-2 mt-0.5" title={it.caption}>{it.caption}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1D1D1F]">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {selected.size} item{selected.size === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              This permanently removes the selected uploads and their files from storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={bulkBusy}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={bulkBusy}>
              {bulkBusy ? 'Deleting…' : `Delete ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
