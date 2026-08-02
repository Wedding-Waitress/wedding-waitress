import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Trash2, Camera, AlertTriangle, ExternalLink, EyeOff, Eye, CheckCircle2, Circle, X, Search, FolderOpen } from 'lucide-react';
import type { GalleryItem, GalleryAlbum } from '@/hooks/useEventMediaGallery';
import { GALLERY_ALBUMS } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { MediaThumb } from './MediaThumb';
import { GalleryLightbox } from './GalleryLightbox';
import { downloadSignedUrl, filenameFor } from './galleryFile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Filter = 'all' | 'approved' | 'hidden';
type MediaTypeFilter = 'all' | 'photos' | 'videos';
type SortMode = 'newest' | 'oldest';
type AlbumFilter = 'all' | GalleryAlbum;

const ALBUM_FILTERS: { value: AlbumFilter; label: string }[] = [
  { value: 'all', label: 'All Uploads' },
  ...GALLERY_ALBUMS.map(a => ({ value: a as AlbumFilter, label: a })),
];


export const GalleryGrid: React.FC<{
  items: GalleryItem[];
  onDelete: (id: string) => void;
  onSetModeration: (id: string, status: 'approved' | 'hidden') => Promise<void>;
  onSetAlbum: (id: string, album: GalleryAlbum | null) => Promise<void>;
  onBulkSetAlbum: (ids: string[], album: GalleryAlbum | null) => Promise<number>;
}> = ({ items, onDelete, onSetModeration, onSetAlbum, onBulkSetAlbum }) => {
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [albumFilter, setAlbumFilter] = useState<AlbumFilter>('all');
  const [mediaType, setMediaType] = useState<MediaTypeFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  // Apply search + media type + album first; moderation counts reflect this subset.
  const searchedTyped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (mediaType === 'photos' && i.kind !== 'photo') return false;
      if (mediaType === 'videos' && i.kind !== 'video') return false;
      if (albumFilter !== 'all') {
        if (albumFilter === 'Other') {
          if (i.album !== null && i.album !== 'Other') return false;
        } else if (i.album !== albumFilter) {
          return false;
        }
      }
      if (q) {
        const hay = `${i.uploader_name || ''} ${i.caption || ''} ${i.guestbook_message || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, mediaType, search, albumFilter]);

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

  // Lightbox navigates approved items only (never hidden/unapproved).
  const lightboxItems = useMemo(
    () => filtered.filter(i => i.moderation_status === 'approved' && !!i.signed_url),
    [filtered]
  );
  const lightboxIndex = useMemo(
    () => (lightboxId ? lightboxItems.findIndex(i => i.id === lightboxId) : -1),
    [lightboxId, lightboxItems]
  );
  // Close if the open item is no longer navigable (hidden, deleted or filtered out).
  useEffect(() => {
    if (lightboxId && lightboxIndex === -1) setLightboxId(null);
  }, [lightboxId, lightboxIndex]);


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

  const bulkMoveToAlbum = async (album: GalleryAlbum | null) => {
    if (selectedItems.length === 0) return;
    setBulkBusy(true);
    try {
      const n = await onBulkSetAlbum(selectedItems.map(i => i.id), album);
      toast({ title: album ? `Moved ${n} to ${album}` : `Removed album from ${n} item${n === 1 ? '' : 's'}` });
    } catch (e: any) {
      toast({ title: 'Could not move items', description: e?.message, variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const moveSingleToAlbum = async (id: string, album: GalleryAlbum | null) => {
    try {
      await onSetAlbum(id, album);
      toast({ title: album ? `Moved to ${album}` : 'Removed from album' });
    } catch (e: any) {
      toast({ title: 'Could not move item', description: e?.message, variant: 'destructive' });
    }
  };

  if (items.length === 0) {
    return (
      <Card className="!bg-black !text-white !border-white/10 p-12 text-center">
        <Camera className="h-12 w-12 mx-auto mb-3 text-white/50" />
        <p className="text-white/70">No uploads yet — share the QR code with your guests.</p>
      </Card>
    );
  }

  const FilterBtn = ({ value, label, count }: { value: Filter; label: string; count: number }) => (
    <button
      onClick={() => setFilter(value)}
      className={`lv-premium-shade px-3 h-9 rounded-md text-sm border transition-colors ${
        filter === value
          ? 'bg-[#967A59] text-white border-[#967A59]'
          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
      }`}
      type="button"
    >
      {label} <span className="opacity-75">({count})</span>
    </button>
  );

  return (
    <Card className="!bg-black !text-white !border-white/10 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-lg font-semibold text-white">Guest uploads ({items.length})</h2>
        <div className="flex gap-2 flex-wrap items-center">
          {!selectMode ? (
            <Button
              className="lv-premium-shade !bg-black !text-white !border-white/20 hover:!bg-white/10"
              variant="outline"
              size="sm"
              onClick={() => setSelectMode(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Select
            </Button>
          ) : (
            <>
              <Button
                className="lv-premium-shade !bg-black !text-white !border-white/20 hover:!bg-white/10"
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {allVisibleSelected ? 'Deselect All' : 'Select All'}
              </Button>
              {visibleSelectedCount > 0 && (
                <Button
                  className="lv-premium-shade"
                  variant="destructive"
                  size="sm"
                  disabled={bulkBusy}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Selected ({visibleSelectedCount})
                </Button>
              )}
              <Button
                className="lv-premium-shade !bg-black !text-white !border-white/20 hover:!bg-white/10"
                variant="outline"
                size="sm"
                onClick={exitSelectMode}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          )}
        </div>

      </div>

      {/* Search + type + sort */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 mb-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search uploader, caption or message…"
            className="h-9 pl-9 !bg-black !text-white !border-white/30 !placeholder:text-white/60"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/60 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={mediaType} onValueChange={(v) => setMediaType(v as MediaTypeFilter)}>
          <SelectTrigger className="h-9 md:w-[140px] !bg-black !text-white !border-white/30"><SelectValue /></SelectTrigger>
          <SelectContent className="!bg-black !border-white/20 text-white">
            <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" value="all">All media</SelectItem>
            <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" value="photos">Photos</SelectItem>
            <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" value="videos">Videos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="h-9 md:w-[150px] !bg-black !text-white !border-white/30"><SelectValue /></SelectTrigger>
          <SelectContent className="!bg-black !border-white/20 text-white">
            <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" value="newest">Newest first</SelectItem>
            <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Album + moderation filter pills in one row */}
      <div className="flex gap-2 flex-wrap mb-4 items-center">
        <FolderOpen className="h-4 w-4 text-white/70" />
        <span className="text-xs text-white/70 mr-1">Album:</span>
        {ALBUM_FILTERS.map(a => {
          const active = albumFilter === a.value;
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => setAlbumFilter(a.value)}
              className={`lv-premium-shade px-3 h-8 rounded-md text-xs border transition-colors ${
                active ? 'bg-[#967A59] text-white border-[#967A59]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              {a.label}
            </button>
          );
        })}
        <div className="w-px h-5 bg-white/20 mx-1" />
        <FilterBtn value="all" label="All" count={counts.all} />
        <FilterBtn value="approved" label="Approved" count={counts.approved} />
        <FilterBtn value="hidden" label="Hidden" count={counts.hidden} />
      </div>



      {selectMode && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4 p-3 rounded-md border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={selectAllVisible}
              className="lv-premium-shade px-3 h-9 rounded-md text-sm border bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              {allVisibleSelected ? 'Clear visible' : `Select all visible (${visibleIds.length})`}
            </button>
            <span className="text-sm text-white/70">
              {visibleSelectedCount} selected{selected.size > visibleSelectedCount ? ` (${selected.size - visibleSelectedCount} hidden by filters)` : ''}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              className="lv-premium-shade !bg-black !text-white !border-white/20 hover:!bg-white/10"
              variant="outline"
              size="sm"
              disabled={bulkBusy || visibleSelectedCount === 0}
              onClick={() => bulkSetModeration('approved')}
            >
              <Eye className="h-4 w-4 mr-1 text-white" /> Approve
            </Button>
            <Button
              className="lv-premium-shade !bg-black !text-white !border-white/20 hover:!bg-white/10"
              variant="outline"
              size="sm"
              disabled={bulkBusy || visibleSelectedCount === 0}
              onClick={() => bulkSetModeration('hidden')}
            >
              <EyeOff className="h-4 w-4 mr-1 text-white" /> Hide
            </Button>
            <Select
              disabled={bulkBusy || visibleSelectedCount === 0}
              value=""
              onValueChange={(v) => bulkMoveToAlbum(v === '__none__' ? null : (v as GalleryAlbum))}
            >
              <SelectTrigger className="lv-premium-shade h-9 w-[170px] !bg-black !text-white !border-white/30">
                <span className="flex items-center text-sm">
                  <FolderOpen className="h-4 w-4 mr-1 text-white/70" /> Move to album…
                </span>
              </SelectTrigger>
              <SelectContent className="!bg-black !border-white/20 text-white">
                {GALLERY_ALBUMS.map(a => (
                  <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" key={a} value={a}>{a}</SelectItem>
                ))}
                <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" value="__none__">No album</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="lv-premium-shade !bg-black !text-white !border-white/20 hover:!bg-white/10"
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
        <p className="text-sm text-white/70 py-8 text-center">No items in this view.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
          {filtered.map(it => {
            const isHidden = it.moderation_status === 'hidden';
            const isSelected = selected.has(it.id);
            const boothBadge = it.is_photo_booth_strip
              ? 'Strip'
              : it.is_photo_booth
                ? 'Booth'
                : it.is_guestbook
                  ? (it.kind === 'audio' ? 'Voice' : 'Video')
                  : null;
            return (
              <div
                key={it.id}
                className={`relative group rounded-lg overflow-hidden border bg-black flex flex-col ${
                  isSelected ? 'border-[#967A59] ring-2 ring-[#967A59]' : 'border-white/20'
                } ${isHidden ? 'opacity-60' : ''}`}
              >
                {/* Square 1:1 thumbnail */}
                <div className="relative w-full aspect-square overflow-hidden">
                  <MediaThumb
                    dark
                    item={it}
                    onOpen={() => {
                      if (selectMode) { toggleOne(it.id); return; }
                      if (it.signed_url) setLightboxId(it.id);
                    }}
                  />

                  {selectMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleOne(it.id); }}
                      className="absolute inset-0 z-20 flex items-start justify-start p-1.5 bg-black/0 hover:bg-black/10 transition-colors"
                      aria-label={isSelected ? 'Deselect' : 'Select'}
                    >
                      <span className={`rounded-full p-0.5 ${isSelected ? 'bg-[#967A59] text-white' : 'bg-white/90 text-[#1D1D1F]'}`}>
                        {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </span>
                    </button>
                  )}

                  {/* Status / type badges */}
                  <div className="absolute top-1 left-1 z-10 flex flex-col items-start gap-1 pointer-events-none">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${
                      isHidden ? 'bg-black/70 text-white' : 'bg-green-600/85 text-white'
                    }`}>
                      {isHidden ? 'Hidden' : 'Approved'}
                    </span>
                    {boothBadge && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide bg-[#967A59]/90 text-white">
                        {boothBadge}
                      </span>
                    )}
                  </div>

                  {!selectMode && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                      {it.signed_url && (
                        <button
                          onClick={() => window.open(it.signed_url!, '_blank', 'noopener,noreferrer')}
                          className="bg-white/10 rounded-md p-1 hover:bg-white/20 text-white"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {it.signed_url && (
                        <button
                          onClick={() => downloadSignedUrl(it.signed_url!, filenameFor(it))}
                          className="bg-white/10 rounded-md p-1 hover:bg-white/20 text-white"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleModeration(it)}
                        className="bg-white/10 rounded-md p-1 hover:bg-white/20 text-white"
                        title={isHidden ? 'Approve / show again' : 'Hide from guests'}
                      >
                        {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this upload? This also removes the file from storage.')) onDelete(it.id); }}
                        className="bg-white/10 rounded-md p-1 hover:bg-white/20 text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Guest reactions (read-only for host) */}
                  {(it.like_count ?? 0) > 0 && (
                    <div className="absolute bottom-1 left-1 z-10 pointer-events-none flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <span aria-hidden>❤️</span>
                      <span>{it.like_count}</span>
                    </div>
                  )}
                </div>


                {/* Meta strip */}
                <div className="px-1.5 py-1.5 border-t border-white/10 bg-black text-[11px]">
                  <div className="font-medium text-white truncate" title={it.uploader_name || 'Anonymous guest'}>
                    {it.uploader_name || 'Anonymous guest'}
                  </div>
                  {it.caption && (
                    <div className="text-white/70 truncate" title={it.caption}>{it.caption}</div>
                  )}
                  <div className="mt-1">
                    <Select
                      value={it.album ?? '__none__'}
                      onValueChange={(v) => moveSingleToAlbum(it.id, v === '__none__' ? null : (v as GalleryAlbum))}
                    >
                      <SelectTrigger className="h-7 text-[10px] px-1.5 !bg-black !text-white !border-white/20" onClick={(e) => e.stopPropagation()}>
                        <span className="flex items-center gap-1 truncate">
                          <FolderOpen className="h-3 w-3 text-white/70 shrink-0" />
                          <span className="truncate">{it.album ?? 'No album'}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent className="!bg-black !border-white/20 text-white">
                        <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" value="__none__">No album</SelectItem>
                        {GALLERY_ALBUMS.map(a => (
                          <SelectItem className="text-white focus:!bg-[#967A59] focus:!text-white" key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightboxIndex >= 0 && (
        <GalleryLightbox
          items={lightboxItems}
          index={lightboxIndex}
          onIndexChange={(i) => setLightboxId(lightboxItems[i]?.id ?? null)}
          onClose={() => setLightboxId(null)}
        />
      )}


      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1D1D1F]">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {visibleSelectedCount} item{visibleSelectedCount === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {visibleSelectedCount} item{visibleSelectedCount === 1 ? '' : 's'}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={bulkBusy}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={bulkBusy}>
              {bulkBusy ? 'Deleting…' : 'Yes, Delete'}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </Card>
  );
};
