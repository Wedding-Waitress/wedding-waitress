// Guestbook Messages — one unified, full-width management card with three tabs:
// Written Messages · Audio Messages · Video Messages.
// Written messages come from public.event_guestbook_messages (plus notes attached to recordings).
// Audio / video recordings come from event_media_items (source_category = 'guestbook_recording').
// All Guestbook content stays private to event organisers.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  MessageSquareText, Mic2, Video, Play, Search, Download, RotateCcw,
  LoaderCircle, TriangleAlert,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { downloadSignedUrl, filenameFor } from './galleryFile';
import { guestbookRecordings } from '@/lib/mediaPrivacy';
import { GuestbookDownloadAllButton } from './GuestbookDownloadAllButton';

import { GuestbookMessageCardPreview } from './GuestbookMessageCardPreview';
import { downloadGuestbookMessagePdf } from '@/lib/guestbookMessagePdf';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

type Status = 'approved' | 'hidden';
type TabKey = 'written' | 'audio' | 'video';
type Source = 'text' | 'recording';

// Open wedding guestbook with a heart and signing pen, matching the guest-facing artwork.
const WeddingGuestbookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 10C12 7 7 6 3 8v18c5-2 9-1 13 2 4-3 8-4 13-2V16M16 10v18M18 9l4-1" />
    <path d="M10 13c-3-3-6 1 0 5 6-4 3-8 0-5ZM7 21l5 1M19 24l6-1" />
    <path d="m19 21 1-5L27 5a1.7 1.7 0 0 1 3 2l-7 11-4 3ZM20 16l3 2M26 7l3 2" />
  </svg>
);

export interface GuestbookTextPreviewRow {
  id: string;
  name: string | null;
  message: string;
  at: string | null;
  status: Status;
  source: Source;
  seq: number | null;
}
type TextRow = GuestbookTextPreviewRow;

interface Props {
  eventId: string | null;
  /** All gallery items for the event (recordings are filtered internally). */
  items: GalleryItem[];
  eventName?: string | null;
  eventDate?: string | null;
  loading?: boolean;
  error?: string | null;
  onSetItemModeration: (id: string, status: Status) => Promise<void>;
  onRefreshRecordings?: () => Promise<void>;
  appearance?: 'default' | 'espresso-glass';
  /** First sharing manager: all statuses, with actions beside sorting. */
  streamlinedToolbar?: boolean;
  readOnly?: boolean;
  readOnlyTextRows?: TextRow[];
  readOnlyRecordingPlayer?: (item: GalleryItem) => React.ReactNode;
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


const GRID = 'grid gap-3 grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8';

export const GalleryGuestbookMessagesCard: React.FC<Props> = ({
  eventId, items, eventName, eventDate, loading, error, onRefreshRecordings, appearance = 'default', streamlinedToolbar = false, readOnly = false, readOnlyTextRows, readOnlyRecordingPlayer,
}) => {
  const isGlass = appearance === 'espresso-glass';
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('written');
  const [textRows, setTextRows] = useState<TextRow[]>([]);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [selectedStatusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const statusFilter = streamlinedToolbar ? 'all' : selectedStatusFilter;
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openText, setOpenText] = useState<TextRow | null>(null);
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  const load = useCallback(async () => {
    if (readOnly) { setTextRows(readOnlyTextRows ?? []); setTextLoading(false); setTextError(readOnlyTextRows ? null : 'Saved read-only messages are unavailable.'); return; }
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
  }, [eventId,readOnly,readOnlyTextRows]);

  useEffect(() => { load(); }, [load]);

  const refreshMessages = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const results = await Promise.allSettled([load(), readOnly ? undefined : onRefreshRecordings?.()]);
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } catch (cause) {
      setRefreshError(cause instanceof Error ? cause.message : 'Could not refresh recordings');
    } finally { setRefreshing(false); }
  };

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
  const switchTab = (t: TabKey) => { setTab(t); setSelectMode(false); resetSelection(); };

  // ---- Recording actions ----
  const handleDownload = async (item: GalleryItem) => {
    if (!item.signed_url) {
      toast({ title: 'Recording unavailable', description: 'This file is still processing. Please refresh and try again.', variant: 'destructive' });
      return;
    }
    try { await downloadSignedUrl(item.signed_url, filenameFor(item, eventName)); }
    catch (e: any) { toast({ title: 'Download failed', description: e?.message || 'Please try again.', variant: 'destructive' }); }
  };

  const [pdfBusy, setPdfBusy] = useState(false);
  const downloadPdf = async (r: TextRow) => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadGuestbookMessagePdf(
        { seq: r.seq, name: r.name, message: r.message, at: r.at, hasRecording: r.source === 'recording' },
        { name: eventName, date: eventDate },
      );
    } catch (e: any) {
      toast({ title: 'Download failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally { setPdfBusy(false); }
  };


  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'written', label: 'Written Messages', count: allWritten.length },
    { key: 'audio', label: 'Audio Messages', count: allAudio.length },
    { key: 'video', label: 'Video Messages', count: allVideo.length },
  ];

  const renderRecordingCard = (item: GalleryItem) => {
    return (
      <li key={item.id} className={cn('rounded-xl border border-border bg-[#FBF8F3] overflow-hidden min-w-0 flex flex-col', isGlass && managementStyles.guestbookMessageCard, selected.has(item.id) && isGlass && managementStyles.guestbookMessageCardSelected)}>
        <button
          type="button"
          onClick={() => setPreview(item)}
          data-guestbook-audio-preview={item.kind !== 'video' ? '' : undefined}
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
          <span className={cn('absolute inset-0 flex items-center justify-center transition-colors', item.kind === 'video' ? 'bg-black/20 group-hover:bg-black/35' : 'group-hover:bg-black/10')}>
            <span className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow">
              <Play className="h-4 w-4 text-[#1D1D1F] ml-0.5" />
            </span>
          </span>


      {!readOnly && tab === 'video' && selectMode && (
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
          {(readOnly || (item.kind === 'video' && (!streamlinedToolbar || item.moderation_status === 'hidden'))) && (<span className={`absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.moderation_status === 'hidden' ? 'bg-white/90 text-[#6E6E73]' : 'bg-green-100 text-green-800'}`}>
            {item.moderation_status === 'hidden' ? 'Hidden' : 'Approved'}
          </span>)}
        </button>

        <div className={cn('p-2 space-y-1 flex-1 flex flex-col min-w-0', isGlass && managementStyles.guestbookMessageBody)}>
          <p className={cn('text-xs font-semibold text-[#1D1D1F] break-words leading-tight', isGlass && managementStyles.galleryViewHeading)}>{item.uploader_name || 'Anonymous guest'}</p>
          <p className={cn('text-[11px] text-[#6E6E73] break-words leading-tight', isGlass && managementStyles.gallerySecondaryText)}>{fmtDate(item.uploaded_at)}</p>
          <p className={cn('text-[11px] text-[#6E6E73] leading-tight', isGlass && managementStyles.gallerySecondaryText)}>{fmtDuration(item.duration_sec)}</p>
          {item.guestbook_message && (
            <p className={cn('text-[11px] text-[#1D1D1F] break-words line-clamp-2', isGlass && managementStyles.galleryViewHeading)} title={item.guestbook_message}>“{item.guestbook_message}”</p>
          )}
          {item.kind !== 'video' && item.signed_url && (
            <audio src={item.signed_url} controls preload="none" className={cn("w-full h-8 mt-1", streamlinedToolbar && managementStyles.guestbookNativeAudio)} />
          )}
          {!item.signed_url && <p className={cn('text-[11px] text-muted-foreground', isGlass && managementStyles.gallerySecondaryText)}>{readOnly ? 'Open to verify recording.' : 'Still processing.'}</p>}
          <div className="flex gap-1 pt-1 mt-auto">
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

  const selectionButton = (
    (readOnly || tab === 'video') && (<Button
            variant="outline"
            size="sm"
            className={cn('lv-premium-shade h-10', isGlass && managementStyles.galleryControl)}
            onClick={() => { setSelectMode(s => !s); resetSelection(); }}
            disabled={readOnly || visibleCount === 0}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </Button>)
  );
  const downloadAllButton = <GuestbookDownloadAllButton stacked={streamlinedToolbar} className={cn('!h-auto min-h-10 min-w-0 whitespace-normal', streamlinedToolbar ? managementStyles.guestbookFeatureButton : 'text-left')} disabled={textLoading || !!textError || loading} items={recordings} writtenMessages={allWritten.map(row => ({...row, hasRecording: row.source === 'recording'}))} eventName={eventName} eventDate={eventDate} appearance={appearance} />;
  const searchField = (
    <div className="relative col-span-2 min-w-0 xl:col-span-1" data-guestbook-search>
      <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground', isGlass && managementStyles.galleryWarmIcon)} />
      <Input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search by guest name or message" placeholder="Search by guest name or message…" className={cn('h-11 pl-9 text-base', isGlass && managementStyles.galleryControl)} />
    </div>
  );
  const toolbarActions = (
        <div className={cn("grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end lg:w-auto lg:shrink-0", streamlinedToolbar && managementStyles.guestbookToolbarActions)} data-guestbook-toolbar="actions">
          <Button variant="outline" size="sm" className={cn('lv-premium-shade h-10', isGlass && managementStyles.galleryControl)} onClick={() => void refreshMessages()} disabled={textLoading || refreshing}>
            {textLoading || refreshing ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <RotateCcw className="h-4 w-4 mr-1" strokeWidth={1.8} />} Refresh
          </Button>
          {!streamlinedToolbar && selectionButton}
          {!streamlinedToolbar && downloadAllButton}
        </div>
  );

  return (
    <Card className={cn('p-5 sm:p-6 space-y-5', isGlass && managementStyles.galleryPanel, isGlass && managementStyles.guestbookMessagesPanel)} data-appearance={isGlass ? appearance : undefined}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className={cn('text-xl font-bold flex items-center gap-2', isGlass && managementStyles.galleryViewHeading)} style={isGlass ? undefined : { color: '#000000' }}>
            <MessageSquareText className={cn('h-5 w-5 text-[#967A59] shrink-0', isGlass && managementStyles.galleryWarmIcon)} strokeWidth={1.8} />
            <span className="min-w-0 break-words">Guestbook Messages ({allWritten.length + recordings.length})</span>
          </h2>
        {streamlinedToolbar ? selectionButton : toolbarActions}
      </div>

      <div
        className={cn("grid grid-cols-2 items-center gap-3 xl:grid-cols-[minmax(220px,1fr)_repeat(3,max-content)_140px_140px]", streamlinedToolbar && managementStyles.guestbookToolbar)}
        data-guestbook-toolbar="filters"
      >
        {!streamlinedToolbar && searchField}
        <div className="col-span-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 xl:contents" data-guestbook-tabs>
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                'min-h-11 min-w-0 rounded-md px-3 py-2 text-sm font-semibold leading-tight text-white bg-[#967A59] transition-shadow',
                tab === t.key
                  ? 'shadow-[inset_0_2px_5px_rgba(0,0,0,0.28)]'
                  : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]',
                isGlass && managementStyles.galleryControl,
                streamlinedToolbar && managementStyles.guestbookFeatureButton,
                isGlass && tab === t.key && managementStyles.galleryControlActive,
              )}
            >
              {streamlinedToolbar && React.createElement(t.key === 'written' ? WeddingGuestbookIcon : t.key === 'audio' ? Mic2 : Video, { 'aria-hidden': true, strokeWidth: 1.8 })}
              <span>{t.label}{' '}<span className={streamlinedToolbar ? 'block' : undefined}>({t.count})</span></span>
            </button>
          ))}
        </div>
        {streamlinedToolbar && downloadAllButton}
        {streamlinedToolbar && searchField}
        <Select value={sort} onValueChange={(v) => setSort(v as 'newest' | 'oldest')}>
          <SelectTrigger aria-label="Sort messages" className={cn('h-11 w-full min-w-0', isGlass && managementStyles.galleryControl)}><SelectValue /></SelectTrigger>
          <SelectContent className={cn(isGlass && managementStyles.gallerySelectContent)}>
            <SelectItem value="newest" className={cn(isGlass && managementStyles.gallerySelectItem)}>Newest first</SelectItem>
            <SelectItem value="oldest" className={cn(isGlass && managementStyles.gallerySelectItem)}>Oldest first</SelectItem>
          </SelectContent>
        </Select>
        {!streamlinedToolbar && (<Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | Status)}>
          <SelectTrigger aria-label="Filter messages by status" className={cn('h-11 w-full min-w-0', isGlass && managementStyles.galleryControl)}><SelectValue /></SelectTrigger>
          <SelectContent className={cn(isGlass && managementStyles.gallerySelectContent)}>
            <SelectItem value="all" className={cn(isGlass && managementStyles.gallerySelectItem)}>All statuses</SelectItem>
            <SelectItem value="approved" className={cn(isGlass && managementStyles.gallerySelectItem)}>Approved</SelectItem>
            <SelectItem value="hidden" className={cn(isGlass && managementStyles.gallerySelectItem)}>Hidden</SelectItem>
          </SelectContent>
        </Select>)}
        {streamlinedToolbar && toolbarActions}
      </div>

      {!readOnly && tab === 'video' && selectMode && (
        <div className={cn('flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3', isGlass && managementStyles.galleryViewInsetPanel)}>
          <label className={cn('flex items-center gap-2 text-sm text-[#1D1D1F]', isGlass && managementStyles.galleryViewHeading)}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(c) => setSelected(c ? new Set(visibleKeys) : new Set())}
            />
            Select all ({visibleCount})
          </label>
          <span className={cn('text-sm text-[#6E6E73]', isGlass && managementStyles.gallerySecondaryText)}>{selected.size} selected</span>

        </div>
      )}

      {(error || textError || refreshError) && (
        <div className={cn('flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/5', isGlass && managementStyles.guestbookStatePanel)}>
          <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" strokeWidth={1.8} />
          <p className="text-sm text-destructive break-words">{error || textError || refreshError}</p>
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
              ? 'No messages here yet, share the QR code or link with your guests.'
              : 'No messages match your search or filters.'}
          </p>
        </div>
      ) : tab === 'written' ? (
        <ul className={streamlinedToolbar ? managementStyles.guestbookWrittenGrid : GRID} data-guestbook-written-grid={streamlinedToolbar ? "compact" : undefined}>
          {writtenRows.map(r => {
            const k = key(r);
            return (
              <li key={k} className={cn('rounded-xl border border-border bg-[#FBF8F3] overflow-hidden min-w-0 flex flex-col', isGlass && managementStyles.guestbookMessageCard, selected.has(k) && isGlass && managementStyles.guestbookMessageCardSelected)}>
                <button
                  type="button"
                  onClick={() => setOpenText(r)}
                  className={cn('relative block w-full bg-[#EFE7DA] p-2 text-left', !streamlinedToolbar && 'aspect-square', isGlass && managementStyles.guestbookMessagePreview, streamlinedToolbar && managementStyles.guestbookWrittenPreview)}
                  aria-label={`Read message from ${r.name || 'Anonymous guest'}`}
                >
                  <span className={cn('block text-[11px] text-[#1D1D1F] leading-snug break-words', !streamlinedToolbar && 'line-clamp-6', isGlass && managementStyles.galleryViewHeading, streamlinedToolbar && managementStyles.guestbookWrittenText)}>{r.message}</span>
                  {readOnly && <span className={`absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.status === 'hidden' ? 'bg-white/90 text-[#6E6E73]' : 'bg-green-100 text-green-800'}`}>{r.status === 'hidden' ? 'Hidden' : 'Approved'}</span>}

                </button>
                <div className={cn('p-2 space-y-1 flex-1 flex flex-col min-w-0', isGlass && managementStyles.guestbookMessageBody)}>
                  <p className={cn('text-xs font-semibold text-[#1D1D1F] break-words leading-tight', isGlass && managementStyles.galleryViewHeading)}>{r.name || 'Anonymous guest'}</p>
                  <p className={cn('text-[11px] text-[#6E6E73] break-words leading-tight', isGlass && managementStyles.gallerySecondaryText)}>{fmtDate(r.at)}</p>
                  {r.source === 'recording' && (
                    <p className="text-[10px] font-semibold text-[#967A59]">Note with recording</p>
                  )}
                  <div className="flex gap-1 pt-1 mt-auto">

                    {r.source === 'text' && (
                      <Button size="sm" variant="outline" className={cn('lv-premium-shade h-8 px-2', isGlass && managementStyles.galleryControl)} disabled={pdfBusy} title="Download message PDF" aria-label="Download message PDF" onClick={() => void downloadPdf(r)}>
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
        <ul className={streamlinedToolbar ? managementStyles.guestbookWrittenGrid : GRID} data-guestbook-recording-grid={streamlinedToolbar ? "compact" : undefined}>
          {list.map(renderRecordingCard)}
        </ul>
      )}

      {/* The readable keepsake preview uses the same renderer as the download. */}
      <Dialog open={!!openText} onOpenChange={(o) => !o && setOpenText(null)}>
        <DialogContent className={managementStyles.guestbookKeepsakeDialog}>
          <DialogHeader className="sr-only"><DialogTitle>{openText?.name || 'Anonymous guest'}</DialogTitle><DialogDescription>Guestbook message card preview</DialogDescription></DialogHeader>
          {openText && <GuestbookMessageCardPreview message={{name:openText.name,message:openText.message,seq:openText.seq,at:openText.at}} event={{name:eventName,date:eventDate}}/>}
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
              {readOnly && readOnlyRecordingPlayer ? readOnlyRecordingPlayer(preview) : preview.signed_url ? (
                preview.kind === 'video' ? (
                  <video src={preview.signed_url} controls autoPlay playsInline className="w-full max-h-[60vh] rounded-lg bg-black" />
                ) : (
                  <audio src={preview.signed_url} controls autoPlay className={cn("w-full", streamlinedToolbar && managementStyles.guestbookNativeAudio)} />
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
