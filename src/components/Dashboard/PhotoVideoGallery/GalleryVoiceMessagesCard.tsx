// Audio & Video Guestbook Messages — full-width moderation list for guest recordings.
// Reuses existing gallery items (is_guestbook recordings: audio, or video recordings).
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic2, Search, CircleCheck, EyeOff, Download, LoaderCircle, TriangleAlert, Video, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadSignedUrl, filenameFor } from './galleryFile';
import { guestbookRecordings } from '@/lib/mediaPrivacy';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

type Status = 'approved' | 'hidden';

interface Props {
  items: GalleryItem[];
  eventName?: string | null;
  loading?: boolean;
  error?: string | null;
  onSetModeration: (id: string, status: Status) => Promise<void>;
}

function fmtDate(at: string | null) {
  if (!at) return '—';
  const d = new Date(at);
  return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

function fmtDuration(sec: number | null) {
  if (!sec || sec <= 0) return '—';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const GalleryVoiceMessagesCard: React.FC<Props> = ({ items, eventName, loading, error, onSetModeration }) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  // Recordings only — text-only guestbook messages are excluded.
  const recordings = useMemo(
    () => guestbookRecordings(items),
    [items],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = recordings;
    if (q) {
      out = out.filter(i =>
        (i.uploader_name || '').toLowerCase().includes(q) ||
        (i.guestbook_message || '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') out = out.filter(i => i.moderation_status === statusFilter);
    return [...out].sort((a, b) => sort === 'newest'
      ? (b.uploaded_at || '').localeCompare(a.uploaded_at || '')
      : (a.uploaded_at || '').localeCompare(b.uploaded_at || ''));
  }, [recordings, search, statusFilter, sort]);

  const audioRows = useMemo(() => rows.filter(i => i.kind !== 'video'), [rows]);
  const videoRows = useMemo(() => rows.filter(i => i.kind === 'video'), [rows]);

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));

  const handleSingle = async (item: GalleryItem, status: Status) => {
    try { await onSetModeration(item.id, status); }
    catch (e: any) { toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' }); }
  };

  const handleBulk = async (status: Status) => {
    const targets = rows.filter(r => selected.has(r.id));
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const t of targets) await onSetModeration(t.id, status);
      toast({ title: status === 'approved' ? 'Recordings approved' : 'Recordings hidden', description: `${targets.length} recording${targets.length === 1 ? '' : 's'} updated.` });
      setSelected(new Set());
      setSelectMode(false);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (item: GalleryItem) => {
    if (!item.signed_url) {
      toast({ title: 'Recording unavailable', description: 'This file is still processing. Please refresh and try again.', variant: 'destructive' });
      return;
    }
    try { await downloadSignedUrl(item.signed_url, filenameFor(item, eventName)); }
    catch (e: any) { toast({ title: 'Download failed', description: e?.message || 'Please try again.', variant: 'destructive' }); }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
            <Mic2 className="h-5 w-5 text-[#967A59] shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 break-words">Audio & Video Guestbook Messages ({recordings.length})</span>
          </h2>
          <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
            Listen to, search, approve or hide the recordings your guests have left.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lv-premium-shade"
          onClick={() => { setSelectMode(s => !s); setSelected(new Set()); }}
          disabled={recordings.length === 0}
        >
          {selectMode ? 'Cancel' : 'Select'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name or written note…"
            className="h-11 pl-9 text-base"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as 'newest' | 'oldest')}>
          <SelectTrigger className="h-11 w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | Status)}>
          <SelectTrigger className="h-11 w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectMode && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <label className="flex items-center gap-2 text-sm text-[#1D1D1F]">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(c) => setSelected(c ? new Set(rows.map(r => r.id)) : new Set())}
            />
            Select all ({rows.length})
          </label>
          <span className="text-sm text-[#6E6E73]">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <Button size="sm" variant="outline" className="lv-premium-shade" disabled={busy || selected.size === 0} onClick={() => handleBulk('approved')}>
              {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <CircleCheck className="h-4 w-4 mr-1" strokeWidth={1.8} />} Approve
            </Button>
            <Button size="sm" variant="outline" className="lv-premium-shade" disabled={busy || selected.size === 0} onClick={() => handleBulk('hidden')}>
              {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <EyeOff className="h-4 w-4 mr-1" strokeWidth={1.8} />} Hide
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5">
          <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" strokeWidth={1.8} />
          <p className="text-sm text-destructive break-words">{error}</p>
        </div>
      )}

      {loading && recordings.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <LoaderCircle className="h-6 w-6 animate-spin text-[#967A59]" strokeWidth={1.8} />
          <p className="text-sm text-muted-foreground">Loading recordings…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center">
          <Mic2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" strokeWidth={1.8} />
          <p className="text-sm text-muted-foreground break-words">
            {recordings.length === 0
              ? 'No voice messages yet. Share the QR code or link so guests can record one.'
              : 'No recordings match your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {([
            { key: 'audio' as const, label: 'Audio Messages', list: audioRows },
            { key: 'video' as const, label: 'Video Messages', list: videoRows },
          ]).filter(g => g.list.length > 0).map(group => (
            <section key={group.key} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#6E6E73] flex items-center gap-2">
                {group.key === 'audio' ? <Mic2 className="h-4 w-4 text-[#967A59]" strokeWidth={1.8} /> : <Video className="h-4 w-4 text-[#967A59]" strokeWidth={1.8} />}
                {group.label} ({group.list.length})
              </h3>
              <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
                {group.list.map(item => (
                  <li key={item.id} className="rounded-xl border border-border bg-[#FBF8F3] overflow-hidden min-w-0 flex flex-col">
                    <button
                      type="button"
                      onClick={() => setPreview(item)}
                      className="relative block w-full aspect-square bg-[#EFE7DA] group"
                      aria-label={`Play recording from ${item.uploader_name || 'Anonymous guest'}`}
                    >
                      {item.kind === 'video' && item.signed_url ? (
                        <video
                          src={item.signed_url}
                          muted
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 w-full h-full object-cover bg-black"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Mic2 className="h-8 w-8 text-[#967A59]" strokeWidth={1.8} />
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                        <span className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow">
                          <Play className="h-4 w-4 text-[#1D1D1F] ml-0.5" strokeWidth={1.8} />
                        </span>
                      </span>
                      {selectMode && (
                        <span
                          className="absolute top-1.5 left-1.5 z-10"
                          onClick={(e) => { e.stopPropagation(); toggleSelected(item.id); }}
                        >
                          <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelected(item.id)} />
                        </span>
                      )}
                      <span
                        className={`absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          item.moderation_status === 'hidden' ? 'bg-white/90 text-[#6E6E73]' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.moderation_status === 'hidden' ? 'Hidden' : 'Approved'}
                      </span>
                    </button>

                    <div className="p-2 space-y-1 flex-1 flex flex-col min-w-0">
                      <p className="text-xs font-semibold text-[#1D1D1F] break-words leading-tight">
                        {item.uploader_name || 'Anonymous guest'}
                      </p>
                      <p className="text-[11px] text-[#6E6E73] break-words leading-tight">
                        {fmtDate(item.uploaded_at)}
                      </p>
                      <p className="text-[11px] text-[#6E6E73] leading-tight">{fmtDuration(item.duration_sec)}</p>
                      {item.guestbook_message && (
                        <p className="text-[11px] text-[#1D1D1F] break-words line-clamp-2" title={item.guestbook_message}>
                          “{item.guestbook_message}”
                        </p>
                      )}
                      {item.kind !== 'video' && item.signed_url && (
                        <audio src={item.signed_url} controls preload="none" className="w-full h-8 mt-1" />
                      )}
                      {!item.signed_url && (
                        <p className="text-[11px] text-muted-foreground">Still processing.</p>
                      )}
                      <div className="flex gap-1 pt-1 mt-auto">
                        {item.moderation_status === 'hidden' ? (
                          <Button size="sm" variant="outline" className="lv-premium-shade flex-1 h-8 px-1 text-[11px]" onClick={() => handleSingle(item, 'approved')}>
                            <CircleCheck className="h-3.5 w-3.5 mr-1" strokeWidth={1.8} /> Show
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="lv-premium-shade flex-1 h-8 px-1 text-[11px]" onClick={() => handleSingle(item, 'hidden')}>
                            <EyeOff className="h-3.5 w-3.5 mr-1" strokeWidth={1.8} /> Hide
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="lv-premium-shade h-8 px-2" title="Download" aria-label="Download recording" onClick={() => handleDownload(item)} disabled={!item.signed_url}>
                          <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-words text-left">
              {preview?.uploader_name || 'Anonymous guest'}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <p className="text-xs text-[#6E6E73]">
                {fmtDate(preview.uploaded_at)} · {fmtDuration(preview.duration_sec)} · {preview.kind === 'video' ? 'Video message' : 'Voice message'}
              </p>
              {preview.signed_url ? (
                preview.kind === 'video' ? (
                  <video src={preview.signed_url} controls autoPlay playsInline className="w-full max-h-[60vh] rounded-lg bg-black" />
                ) : (
                  <audio src={preview.signed_url} controls autoPlay className="w-full" />
                )
              ) : (
                <p className="text-sm text-muted-foreground">Recording is still processing.</p>
              )}
              {preview.guestbook_message && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-[#6E6E73]">Written note</p>
                  <p className="text-sm text-[#1D1D1F] mt-1 break-words whitespace-pre-wrap">{preview.guestbook_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </Card>
  );
};

export default GalleryVoiceMessagesCard;
