// Guestbook Messages — one unified, full-width management card with three tabs:
// Written Messages · Audio Messages · Video Messages.
// Written messages come from public.event_guestbook_messages (plus notes attached to recordings).
// Audio / video recordings come from event_media_items (source_category = 'guestbook_recording').
// Recordings stay PRIVATE unless the organiser deliberately clicks "Add to Gallery".
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MessageSquareText, Mic2, Video, Play, Search, CircleCheck, EyeOff, Download, RotateCcw,
  LoaderCircle, TriangleAlert, ImagePlus, ImageMinus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { downloadSignedUrl, filenameFor } from './galleryFile';
import { guestbookRecordings } from '@/lib/mediaPrivacy';
import { GuestbookDownloadAllButton } from './GuestbookDownloadAllButton';

import { guestbookCsvFilename, guestbookMessageFilename, guestbookMessageTxt, guestbookSeqLabel } from '@/lib/guestbookFilename';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

type Status = 'approved' | 'hidden';
type TabKey = 'written' | 'audio' | 'video';
type Source = 'text' | 'recording';

interface TextRow {
  id: string;
  name: string | null;
  message: string;
  at: string | null;
  status: Status;
  source: Source;
  seq: number | null;
}

interface Props {
  eventId: string | null;
  /** All gallery items for the event (recordings are filtered internally). */
  items: GalleryItem[];
  eventName?: string | null;
  loading?: boolean;
  error?: string | null;
  onSetItemModeration: (id: string, status: Status) => Promise<void>;
  onSetGuestbookShare: (id: string, shared: boolean) => Promise<void>;
  appearance?: 'default' | 'espresso-glass';
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

function csvCell(v: string) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

const GRID = 'grid gap-3 grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8';

export const GalleryGuestbookMessagesCard: React.FC<Props> = ({
  eventId, items, eventName, loading, error, onSetItemModeration, onSetGuestbookShare, appearance = 'default',
}) => {
  const isGlass = appearance === 'espresso-glass';
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('written');
  const [textRows, setTextRows] = useState<TextRow[]>([]);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [openText, setOpenText] = useState<TextRow | null>(null);
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  const load = useCallback(async () => {
    if (!eventId) { setTextRows([]); return; }
    setTextLoading(true);
    setTextError(null);
    const { data, error: err } = await (supabase as any)
      .from('event_guestbook_messages')
      .select('id, uploader_name, message, moderation_status, created_at, guestbook_seq')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (err) setTextError(err.message || 'Could not load messages');
    setTextRows(((data || []) as any[]).map(r => ({
      id: r.id,
      name: r.uploader_name,
      message: r.message,
      at: r.created_at,
      status: (r.moderation_status === 'hidden' ? 'hidden' : 'approved') as Status,
      source: 'text' as const,
      seq: typeof r.guestbook_seq === 'number' ? r.guestbook_seq : null,
    })));
    setTextLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // Written notes attached to recordings — surfaced in the Written tab, recording untouched.
  const noteRows: TextRow[] = useMemo(() => items
    .filter(i => (i.guestbook_message || '').trim().length > 0)
    .map(i => ({
      id: i.id,
      name: i.uploader_name,
      message: i.guestbook_message as string,
      at: i.uploaded_at,
      status: (i.moderation_status === 'hidden' ? 'hidden' : 'approved') as Status,
      source: 'recording' as const,
      seq: null,
    })), [items]);

  const allWritten = useMemo(() => [...textRows, ...noteRows], [textRows, noteRows]);
  const recordings = useMemo(() => guestbookRecordings(items), [items]);
  const allAudio = useMemo(() => recordings.filter(i => i.kind !== 'video'), [recordings]);
  const allVideo = useMemo(() => recordings.filter(i => i.kind === 'video'), [recordings]);

  const q = search.trim().toLowerCase();

  const writtenRows = useMemo(() => {
    let out = allWritten;
    if (q) out = out.filter(r => (r.name || '').toLowerCase().includes(q) || r.message.toLowerCase().includes(q));
    if (statusFilter !== 'all') out = out.filter(r => r.status === statusFilter);
    return [...out].sort((a, b) => sort === 'newest'
      ? (b.at || '').localeCompare(a.at || '')
      : (a.at || '').localeCompare(b.at || ''));
  }, [allWritten, q, statusFilter, sort]);

  const filterRecordings = useCallback((list: GalleryItem[]) => {
    let out = list;
    if (q) {
      out = out.filter(i =>
        (i.uploader_name || '').toLowerCase().includes(q) ||
        (i.guestbook_message || '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') out = out.filter(i => (i.moderation_status || 'approved') === statusFilter);
    return [...out].sort((a, b) => sort === 'newest'
      ? (b.uploaded_at || '').localeCompare(a.uploaded_at || '')
      : (a.uploaded_at || '').localeCompare(b.uploaded_at || ''));
  }, [q, statusFilter, sort]);

  const audioRows = useMemo(() => filterRecordings(allAudio), [filterRecordings, allAudio]);
  const videoRows = useMemo(() => filterRecordings(allVideo), [filterRecordings, allVideo]);

  const key = (r: TextRow) => `${r.source}:${r.id}`;
  const visibleKeys = tab === 'written'
    ? writtenRows.map(key)
    : (tab === 'audio' ? audioRows : videoRows).map(i => i.id);
  const visibleCount = visibleKeys.length;
  const allSelected = visibleCount > 0 && visibleKeys.every(k => selected.has(k));

  const resetSelection = () => { setSelected(new Set()); };
  const switchTab = (t: TabKey) => { setTab(t); resetSelection(); };

  // ---- Written message moderation ----
  const setTextStatus = useCallback(async (r: TextRow, status: Status) => {
    if (r.source === 'recording') {
      await onSetItemModeration(r.id, status);
      return;
    }
    const prev = r.status;
    setTextRows(curr => curr.map(x => (x.id === r.id ? { ...x, status } : x)));
    const { error: err } = await (supabase as any)
      .from('event_guestbook_messages')
      .update({ moderation_status: status })
      .eq('id', r.id);
    if (err) {
      setTextRows(curr => curr.map(x => (x.id === r.id ? { ...x, status: prev } : x)));
      throw new Error(err.message || 'Could not update message');
    }
  }, [onSetItemModeration]);

  const handleWrittenSingle = async (r: TextRow, status: Status) => {
    try { await setTextStatus(r, status); }
    catch (e: any) { toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' }); }
  };

  const handleWrittenBulk = async (status: Status) => {
    const targets = writtenRows.filter(r => selected.has(key(r)));
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const r of targets) await setTextStatus(r, status);
      toast({ title: status === 'approved' ? 'Messages approved' : 'Messages hidden', description: `${targets.length} message${targets.length === 1 ? '' : 's'} updated.` });
      resetSelection();
      setSelectMode(false);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  // ---- Recording actions ----
  const handleShare = async (item: GalleryItem, shared: boolean) => {
    try {
      await onSetGuestbookShare(item.id, shared);
      toast({ title: shared ? 'Added to gallery' : 'Removed from gallery' });
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const handleShareBulk = async (shared: boolean) => {
    const list = tab === 'audio' ? audioRows : videoRows;
    const targets = list.filter(i => selected.has(i.id));
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const t of targets) await onSetGuestbookShare(t.id, shared);
      toast({ title: shared ? 'Added to gallery' : 'Removed from gallery', description: `${targets.length} recording${targets.length === 1 ? '' : 's'} updated.` });
      resetSelection();
      setSelectMode(false);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const handleDownload = async (item: GalleryItem) => {
    if (!item.signed_url) {
      toast({ title: 'Recording unavailable', description: 'This file is still processing. Please refresh and try again.', variant: 'destructive' });
      return;
    }
    try { await downloadSignedUrl(item.signed_url, filenameFor(item, eventName)); }
    catch (e: any) { toast({ title: 'Download failed', description: e?.message || 'Please try again.', variant: 'destructive' }); }
  };

  const downloadTxt = (r: TextRow) => {
    try {
      const body = guestbookMessageTxt(
        { seq: r.seq, name: r.name, message: r.message, at: r.at, status: r.status, hasRecording: r.source === 'recording' },
        eventName,
      );
      const blob = new Blob(['\uFEFF' + body], { type: 'text/plain;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = guestbookMessageFilename(r.seq, eventName);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e: any) {
      toast({ title: 'Download failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const exportCsv = () => {
    if (writtenRows.length === 0) return;
    const header = ['Message Number', 'Guest name', 'Message', 'Submitted', 'Status'];
    const body = writtenRows.map(r => [
      csvCell(guestbookSeqLabel(r.seq)),
      csvCell(r.name || 'Anonymous guest'),
      csvCell(r.message),
      csvCell(r.at ? new Date(r.at).toLocaleString() : ''),
      csvCell(r.status === 'hidden' ? 'Hidden' : 'Approved'),
    ].join(','));
    const csv = [header.map(csvCell).join(','), ...body].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = guestbookCsvFilename(eventName);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast({ title: 'Export started', description: `${writtenRows.length} message${writtenRows.length === 1 ? '' : 's'} exported.` });
  };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'written', label: 'Written Messages', count: allWritten.length },
    { key: 'audio', label: 'Audio Messages', count: allAudio.length },
    { key: 'video', label: 'Video Messages', count: allVideo.length },
  ];

  const renderRecordingCard = (item: GalleryItem) => {
    const shared = item.shared_to_gallery === true;
    return (
      <li key={item.id} className={cn('rounded-xl border border-border bg-[#FBF8F3] overflow-hidden min-w-0 flex flex-col', isGlass && managementStyles.guestbookMessageCard, selected.has(item.id) && isGlass && managementStyles.guestbookMessageCardSelected)}>
        <button
          type="button"
          onClick={() => setPreview(item)}
          className={cn('relative block w-full aspect-square bg-[#EFE7DA] group', isGlass && managementStyles.guestbookMessagePreview)}
          aria-label={`Play recording from ${item.uploader_name || 'Anonymous guest'}`}
        >
          {item.kind === 'video' && item.signed_url ? (
            <video src={item.signed_url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover bg-black" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <Mic2 className="h-8 w-8 text-[#967A59]" strokeWidth={1.8} />
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
            <span className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow">
              <Play className="h-4 w-4 text-[#1D1D1F] ml-0.5" />
            </span>
          </span>
          {selectMode && (
            <span
              className="absolute top-1.5 left-1.5 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(prev => {
                  const next = new Set(prev);
                  next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                  return next;
                });
              }}
            >
              <Checkbox checked={selected.has(item.id)} />
            </span>
          )}
          <span className={`absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.moderation_status === 'hidden' ? 'bg-white/90 text-[#6E6E73]' : 'bg-green-100 text-green-800'}`}>
            {item.moderation_status === 'hidden' ? 'Hidden' : 'Approved'}
          </span>
          {shared && (
            <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#967A59] text-white">
              In Gallery
            </span>
          )}
        </button>

        <div className={cn('p-2 space-y-1 flex-1 flex flex-col min-w-0', isGlass && managementStyles.guestbookMessageBody)}>
          <p className={cn('text-xs font-semibold text-[#1D1D1F] break-words leading-tight', isGlass && managementStyles.galleryViewHeading)}>{item.uploader_name || 'Anonymous guest'}</p>
          <p className={cn('text-[11px] text-[#6E6E73] break-words leading-tight', isGlass && managementStyles.gallerySecondaryText)}>{fmtDate(item.uploaded_at)}</p>
          <p className={cn('text-[11px] text-[#6E6E73] leading-tight', isGlass && managementStyles.gallerySecondaryText)}>{fmtDuration(item.duration_sec)}</p>
          {item.guestbook_message && (
            <p className={cn('text-[11px] text-[#1D1D1F] break-words line-clamp-2', isGlass && managementStyles.galleryViewHeading)} title={item.guestbook_message}>“{item.guestbook_message}”</p>
          )}
          {item.kind !== 'video' && item.signed_url && (
            <audio src={item.signed_url} controls preload="none" className="w-full h-8 mt-1" />
          )}
          {!item.signed_url && <p className={cn('text-[11px] text-muted-foreground', isGlass && managementStyles.gallerySecondaryText)}>Still processing.</p>}
          <div className="flex gap-1 pt-1 mt-auto">
            {shared ? (
              <Button size="sm" variant="outline" className={cn('lv-premium-shade flex-1 h-8 px-1 text-[11px]', isGlass && managementStyles.galleryControl)} onClick={() => handleShare(item, false)}>
                <ImageMinus className="h-3.5 w-3.5 mr-1" strokeWidth={1.8} /> Remove
              </Button>
            ) : (
              <Button size="sm" variant="outline" className={cn('lv-premium-shade flex-1 h-8 px-1 text-[11px]', isGlass && managementStyles.galleryControl)} onClick={() => handleShare(item, true)}>
                <ImagePlus className="h-3.5 w-3.5 mr-1" strokeWidth={1.8} /> Add to Gallery
              </Button>
            )}
            <Button size="sm" variant="outline" className={cn('lv-premium-shade h-8 px-2', isGlass && managementStyles.galleryControl)} title="Download" aria-label="Download recording" onClick={() => handleDownload(item)} disabled={!item.signed_url}>
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </li>
    );
  };

  const list = tab === 'audio' ? audioRows : videoRows;
  const totalForTab = tab === 'written' ? allWritten.length : (tab === 'audio' ? allAudio.length : allVideo.length);

  return (
    <Card className={cn('p-5 sm:p-6 space-y-5', isGlass && managementStyles.galleryPanel, isGlass && managementStyles.guestbookMessagesPanel)} data-appearance={isGlass ? appearance : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
            <MessageSquareText className={cn('h-5 w-5 text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} strokeWidth={1.8} />
            <span className="min-w-0 break-words">Guestbook Messages ({allWritten.length + recordings.length})</span>
          </h2>
          <p className={cn('text-sm mt-1 break-words', isGlass && managementStyles.gallerySecondaryText)} style={isGlass ? undefined : { color: '#1a1a1a' }}>
            Written, audio and video messages your guests have left — private unless you add them to the gallery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)} onClick={() => load()} disabled={textLoading}>
            {textLoading ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <RotateCcw className="h-4 w-4 mr-1" strokeWidth={1.8} />} Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)}
            onClick={() => { setSelectMode(s => !s); resetSelection(); }}
            disabled={visibleCount === 0}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </Button>
        </div>
      </div>

      {/* Row 1: search (left) · downloads + export (right) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] lg:max-w-[520px]">
          <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground', isGlass && managementStyles.galleryWarmIcon)} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name or message…"
            className={cn('h-11 pl-9 text-base', isGlass && managementStyles.galleryControl)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <GuestbookDownloadAllButton items={recordings} eventName={eventName} appearance={appearance} />
          {tab === 'written' && (
            <Button className={cn('ww-emboss-green ww-emboss-green-soft h-11 text-white border-0', isGlass && managementStyles.galleryViewPrimaryAction)} onClick={exportCsv} disabled={writtenRows.length === 0}>
              <Download className="h-4 w-4 mr-1 text-white" strokeWidth={1.8} /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: message types (left) · sort + status (right) */}
      <div className="flex flex-wrap items-center gap-3">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              'h-11 px-4 rounded-md text-sm font-semibold text-white bg-[#967A59] transition-shadow',
              tab === t.key
                ? 'shadow-[inset_0_2px_5px_rgba(0,0,0,0.28)]'
                : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]',
              isGlass && managementStyles.galleryControl,
              isGlass && tab === t.key && managementStyles.galleryControlActive,
            )}
          >
            {t.label} ({t.count})
          </button>
        ))}
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <Select value={sort} onValueChange={(v) => setSort(v as 'newest' | 'oldest')}>
            <SelectTrigger className={cn('h-11 w-full sm:w-[150px]', isGlass && managementStyles.galleryControl)}><SelectValue /></SelectTrigger>
            <SelectContent className={cn(isGlass && managementStyles.gallerySelectContent)}>
              <SelectItem value="newest" className={cn(isGlass && managementStyles.gallerySelectItem)}>Newest first</SelectItem>
              <SelectItem value="oldest" className={cn(isGlass && managementStyles.gallerySelectItem)}>Oldest first</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | Status)}>
            <SelectTrigger className={cn('h-11 w-full sm:w-[150px]', isGlass && managementStyles.galleryControl)}><SelectValue /></SelectTrigger>
            <SelectContent className={cn(isGlass && managementStyles.gallerySelectContent)}>
              <SelectItem value="all" className={cn(isGlass && managementStyles.gallerySelectItem)}>All statuses</SelectItem>
              <SelectItem value="approved" className={cn(isGlass && managementStyles.gallerySelectItem)}>Approved</SelectItem>
              <SelectItem value="hidden" className={cn(isGlass && managementStyles.gallerySelectItem)}>Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>



      {selectMode && (
        <div className={cn('flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3', isGlass && managementStyles.galleryViewInsetPanel)}>
          <label className={cn('flex items-center gap-2 text-sm text-[#1D1D1F]', isGlass && managementStyles.galleryViewHeading)}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(c) => setSelected(c ? new Set(visibleKeys) : new Set())}
            />
            Select all ({visibleCount})
          </label>
          <span className={cn('text-sm text-[#6E6E73]', isGlass && managementStyles.gallerySecondaryText)}>{selected.size} selected</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            {tab === 'written' ? (
              <>
                <Button size="sm" variant="outline" className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)} disabled={busy || selected.size === 0} onClick={() => handleWrittenBulk('approved')}>
                  {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <CircleCheck className="h-4 w-4 mr-1" strokeWidth={1.8} />} Approve
                </Button>
                <Button size="sm" variant="outline" className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)} disabled={busy || selected.size === 0} onClick={() => handleWrittenBulk('hidden')}>
                  {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <EyeOff className="h-4 w-4 mr-1" strokeWidth={1.8} />} Hide
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)} disabled={busy || selected.size === 0} onClick={() => handleShareBulk(true)}>
                  {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <ImagePlus className="h-4 w-4 mr-1" strokeWidth={1.8} />} Add to Gallery
                </Button>
                <Button size="sm" variant="outline" className={cn('lv-premium-shade', isGlass && managementStyles.galleryControl)} disabled={busy || selected.size === 0} onClick={() => handleShareBulk(false)}>
                  {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <ImageMinus className="h-4 w-4 mr-1" strokeWidth={1.8} />} Remove from Gallery
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {(error || textError) && (
        <div className={cn('flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5', isGlass && managementStyles.guestbookStatePanel)}>
          <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" strokeWidth={1.8} />
          <p className="text-sm text-destructive break-words">{error || textError}</p>
        </div>
      )}

      {/* Content */}
      {(tab === 'written' ? textLoading && allWritten.length === 0 : loading && recordings.length === 0) ? (
        <div className={cn('py-12 flex flex-col items-center gap-3', isGlass && managementStyles.guestbookStatePanel)}>
          <LoaderCircle className="h-6 w-6 animate-spin text-[#967A59]" strokeWidth={1.8} />
          <p className="text-sm text-muted-foreground">Loading messages…</p>
        </div>
      ) : visibleCount === 0 ? (
        <div className={cn('py-12 text-center', isGlass && managementStyles.guestbookStatePanel)}>
          {tab === 'written' ? <MessageSquareText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" strokeWidth={1.8} />
            : tab === 'audio' ? <Mic2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" strokeWidth={1.8} />
            : <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground" strokeWidth={1.8} />}
          <p className="text-sm text-muted-foreground break-words">
            {totalForTab === 0
              ? 'No messages here yet — share the QR code or link with your guests.'
              : 'No messages match your search or filters.'}
          </p>
        </div>
      ) : tab === 'written' ? (
        <ul className={GRID}>
          {writtenRows.map(r => {
            const k = key(r);
            return (
              <li key={k} className={cn('rounded-xl border border-border bg-[#FBF8F3] overflow-hidden min-w-0 flex flex-col', isGlass && managementStyles.guestbookMessageCard, selected.has(k) && isGlass && managementStyles.guestbookMessageCardSelected)}>
                <button
                  type="button"
                  onClick={() => setOpenText(r)}
                  className={cn('relative block w-full aspect-square bg-[#EFE7DA] p-2 text-left', isGlass && managementStyles.guestbookMessagePreview)}
                  aria-label={`Read message from ${r.name || 'Anonymous guest'}`}
                >
                  <span className={cn('block text-[11px] text-[#1D1D1F] leading-snug line-clamp-6 break-words', isGlass && managementStyles.galleryViewHeading)}>{r.message}</span>
                  <span className={`absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.status === 'hidden' ? 'bg-white/90 text-[#6E6E73]' : 'bg-green-100 text-green-800'}`}>
                    {r.status === 'hidden' ? 'Hidden' : 'Approved'}
                  </span>
                  {selectMode && (
                    <span
                      className="absolute top-1.5 left-1.5 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(prev => {
                          const next = new Set(prev);
                          next.has(k) ? next.delete(k) : next.add(k);
                          return next;
                        });
                      }}
                    >
                      <Checkbox checked={selected.has(k)} />
                    </span>
                  )}
                </button>
                <div className={cn('p-2 space-y-1 flex-1 flex flex-col min-w-0', isGlass && managementStyles.guestbookMessageBody)}>
                  <p className={cn('text-xs font-semibold text-[#1D1D1F] break-words leading-tight', isGlass && managementStyles.galleryViewHeading)}>{r.name || 'Anonymous guest'}</p>
                  <p className={cn('text-[11px] text-[#6E6E73] break-words leading-tight', isGlass && managementStyles.gallerySecondaryText)}>{fmtDate(r.at)}</p>
                  {r.source === 'recording' && (
                    <p className="text-[10px] font-semibold text-[#967A59]">Note with recording</p>
                  )}
                  <div className="flex gap-1 pt-1 mt-auto">
                    {r.status === 'approved' ? (
                      <Button size="sm" variant="outline" className={cn('lv-premium-shade flex-1 h-8 px-1 text-[11px]', isGlass && managementStyles.galleryControl)} onClick={() => handleWrittenSingle(r, 'hidden')}>
                        <EyeOff className="h-3.5 w-3.5 mr-1" strokeWidth={1.8} /> Hide
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className={cn('lv-premium-shade flex-1 h-8 px-1 text-[11px]', isGlass && managementStyles.galleryControl)} onClick={() => handleWrittenSingle(r, 'approved')}>
                        <CircleCheck className="h-3.5 w-3.5 mr-1" strokeWidth={1.8} /> Show
                      </Button>
                    )}
                    {r.source === 'text' && (
                      <Button size="sm" variant="outline" className={cn('lv-premium-shade h-8 px-2', isGlass && managementStyles.galleryControl)} title="Download message" aria-label="Download message" onClick={() => downloadTxt(r)}>
                        <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className={GRID}>
          {list.map(renderRecordingCard)}
        </ul>
      )}

      {/* Written message dialog */}
      <Dialog open={!!openText} onOpenChange={(o) => !o && setOpenText(null)}>
        <DialogContent className={cn('max-w-lg', isGlass && managementStyles.guestbookDialog)}>
          <DialogHeader>
            <DialogTitle className={cn('break-words text-left', isGlass && managementStyles.galleryViewHeading)}>{openText?.name || 'Anonymous guest'}</DialogTitle>
          </DialogHeader>
          {openText && (
            <div className="space-y-3">
              <p className={cn('text-xs text-[#6E6E73]', isGlass && managementStyles.gallerySecondaryText)}>{fmtDate(openText.at)}</p>
              <p className={cn('text-sm text-[#1D1D1F] whitespace-pre-wrap break-words', isGlass && managementStyles.galleryViewHeading)}>{openText.message}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recording dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className={cn('max-w-2xl', isGlass && managementStyles.guestbookDialog)}>
          <DialogHeader>
            <DialogTitle className={cn('break-words text-left', isGlass && managementStyles.galleryViewHeading)}>{preview?.uploader_name || 'Anonymous guest'}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <p className={cn('text-xs text-[#6E6E73]', isGlass && managementStyles.gallerySecondaryText)}>
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
                <div className={cn('rounded-lg bg-muted/40 p-3', isGlass && managementStyles.galleryViewInsetPanel)}>
                  <p className={cn('text-xs uppercase tracking-wide text-[#6E6E73]', isGlass && managementStyles.gallerySecondaryText)}>Written note</p>
                  <p className={cn('text-sm text-[#1D1D1F] mt-1 break-words whitespace-pre-wrap', isGlass && managementStyles.galleryViewHeading)}>{preview.guestbook_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default GalleryGuestbookMessagesCard;
