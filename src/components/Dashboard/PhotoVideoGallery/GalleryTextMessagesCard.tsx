// Digital Guestbook Messages — full-width moderation list for written guest messages.
// Reuses existing records: public.event_guestbook_messages (text submissions) plus the
// written note attached to Voice Guestbook recordings (event_media_items.guestbook_message).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquareText, LoaderCircle, Search, CircleCheck, EyeOff, Download, RotateCcw, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { guestbookCsvFilename, guestbookMessageFilename, guestbookMessageTxt, guestbookSeqLabel } from '@/lib/guestbookFilename';

type Status = 'approved' | 'hidden';
type Source = 'text' | 'recording';

interface Row {
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
  /** Existing gallery items — used only to surface written notes left with a recording. */
  items: GalleryItem[];
  eventName?: string | null;
  /** Existing moderation handler for media items (recordings). */
  onSetItemModeration: (id: string, status: Status) => Promise<void>;
}

function fmt(at: string | null) {
  if (!at) return '—';
  const d = new Date(at);
  return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

function csvCell(v: string) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export const GalleryTextMessagesCard: React.FC<Props> = ({ eventId, items, eventName, onSetItemModeration }) => {
  const { toast } = useToast();
  const [textRows, setTextRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) { setTextRows([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await (supabase as any)
      .from('event_guestbook_messages')
      .select('id, uploader_name, message, moderation_status, created_at, guestbook_seq')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (err) setError(err.message || 'Could not load messages');
    setTextRows(((data || []) as any[]).map(r => ({
      id: r.id,
      name: r.uploader_name,
      message: r.message,
      at: r.created_at,
      status: (r.moderation_status === 'hidden' ? 'hidden' : 'approved') as Status,
      source: 'text' as const,
      seq: typeof r.guestbook_seq === 'number' ? r.guestbook_seq : null,
    })));
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // Written notes attached to recordings — shown here, recording itself untouched.
  const recordingRows: Row[] = useMemo(() => items
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

  const allRows = useMemo(() => [...textRows, ...recordingRows], [textRows, recordingRows]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = allRows;
    if (q) out = out.filter(r => (r.name || '').toLowerCase().includes(q) || r.message.toLowerCase().includes(q));
    if (statusFilter !== 'all') out = out.filter(r => r.status === statusFilter);
    return [...out].sort((a, b) => sort === 'newest'
      ? (b.at || '').localeCompare(a.at || '')
      : (a.at || '').localeCompare(b.at || ''));
  }, [allRows, search, statusFilter, sort]);

  const key = (r: Row) => `${r.source}:${r.id}`;

  const setStatus = useCallback(async (r: Row, status: Status) => {
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

  const handleSingle = async (r: Row, status: Status) => {
    try { await setStatus(r, status); }
    catch (e: any) { toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' }); }
  };

  const handleBulk = async (status: Status) => {
    const targets = rows.filter(r => selected.has(key(r)));
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const r of targets) await setStatus(r, status);
      toast({ title: status === 'approved' ? 'Messages approved' : 'Messages hidden', description: `${targets.length} message${targets.length === 1 ? '' : 's'} updated.` });
      setSelected(new Set());
      setSelectMode(false);
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const downloadTxt = (r: Row) => {
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
    if (rows.length === 0) return;
    const header = ['Message Number', 'Guest name', 'Message', 'Submitted', 'Status'];
    const body = rows.map(r => [
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
    toast({ title: 'Export started', description: `${rows.length} message${rows.length === 1 ? '' : 's'} exported.` });
  };

  const allSelected = rows.length > 0 && rows.every(r => selected.has(key(r)));

  return (
    <Card className="p-5 sm:p-6 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-6">
        {/* LEFT — control panel */}
        <div className="space-y-4 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
              <MessageSquareText className="h-5 w-5 text-[#967A59] shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 break-words">Digital Guestbook Messages ({allRows.length})</span>
            </h2>
            <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
              Read, search, approve or hide the written messages your guests have left.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="lv-premium-shade" onClick={() => load()} disabled={loading}>
              {loading ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <RotateCcw className="h-4 w-4 mr-1" strokeWidth={1.8} />} Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lv-premium-shade"
              onClick={() => { setSelectMode(s => !s); setSelected(new Set()); }}
              disabled={allRows.length === 0}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by guest name or message…"
                className="h-11 pl-9 text-base"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as 'newest' | 'oldest')}>
              <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | Status)}>
              <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectMode && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(c) => setSelected(c ? new Set(rows.map(key)) : new Set())}
                />
                Select all ({rows.length})
              </label>
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="lv-premium-shade" disabled={busy || selected.size === 0} onClick={() => handleBulk('approved')}>
                  {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <CircleCheck className="h-4 w-4 mr-1" strokeWidth={1.8} />} Approve
                </Button>
                <Button size="sm" variant="outline" className="lv-premium-shade" disabled={busy || selected.size === 0} onClick={() => handleBulk('hidden')}>
                  {busy ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <EyeOff className="h-4 w-4 mr-1" strokeWidth={1.8} />} Hide
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border space-y-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1D1D1F]">Export Messages</p>
              <p className="text-xs text-muted-foreground break-words">Exports the {rows.length} message{rows.length === 1 ? '' : 's'} currently shown.</p>
            </div>
            <Button variant="outline" className="lv-premium-shade w-full" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-1" strokeWidth={1.8} /> Export Digital Guestbook Messages as CSV
            </Button>
          </div>
        </div>

        {/* RIGHT — scrollable accordion message panel */}
        <div className="min-w-0">
          {error && <p className="text-sm text-destructive break-words mb-3">{error}</p>}
          <div className="h-[520px] overflow-y-auto pr-2 rounded-xl border border-border bg-muted/20 p-3">
            {loading ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <LoaderCircle className="h-6 w-6 animate-spin text-[#967A59]" strokeWidth={1.8} />
                <p className="text-sm text-muted-foreground">Loading messages…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquareText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" strokeWidth={1.8} />
                <p className="text-sm text-muted-foreground break-words">
                  {allRows.length === 0
                    ? 'No written messages yet — share the QR code or link with your guests.'
                    : 'No messages match your search or filters.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {rows.map(r => {
                  const k = key(r);
                  const isSel = selected.has(k);
                  const isOpen = expanded === k;
                  return (
                    <li key={k} className="rounded-xl border border-border bg-[#FBF8F3] overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        {selectMode && (
                          <Checkbox
                            className="shrink-0"
                            checked={isSel}
                            onCheckedChange={(c) => setSelected(prev => {
                              const next = new Set(prev);
                              if (c) next.add(k); else next.delete(k);
                              return next;
                            })}
                          />
                        )}
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left flex items-center gap-2 flex-wrap"
                          onClick={() => setExpanded(isOpen ? null : k)}
                          aria-expanded={isOpen}
                        >
                          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          <span className="text-sm font-semibold text-[#1D1D1F] break-words">{r.name || 'Anonymous guest'}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.status === 'hidden' ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-800'}`}>
                            {r.status === 'hidden' ? 'Hidden' : 'Approved'}
                          </span>
                          {r.source === 'recording' && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#967A59]/15 text-[#967A59]">Note with recording</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">{fmt(r.at)}</span>
                        </button>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 pt-0">
                          <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap break-words">{r.message}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {r.source === 'text' && (
                              <Button size="sm" variant="outline" className="lv-premium-shade" title="Download message" aria-label="Download message" onClick={() => downloadTxt(r)}>
                                <Download className="h-4 w-4" strokeWidth={1.8} />
                              </Button>
                            )}
                            {r.status === 'approved' ? (
                              <Button size="sm" variant="outline" className="lv-premium-shade" onClick={() => handleSingle(r, 'hidden')}>
                                <EyeOff className="h-4 w-4 mr-1" strokeWidth={1.8} /> Hide
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="lv-premium-shade" onClick={() => handleSingle(r, 'approved')}>
                                <CircleCheck className="h-4 w-4 mr-1" strokeWidth={1.8} /> Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GalleryTextMessagesCard;
