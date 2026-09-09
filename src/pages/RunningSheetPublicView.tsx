import { Printer as ExportControlsPrinter } from 'lucide-react';
import { DEFAULT_RUNNING_SHEET_ROWS } from '@/lib/runningSheetDefaults';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, AlertCircle, Download, Loader2, FileText, Check, CloudOff, Printer, ClipboardList, HeartHandshake, CalendarDays, Clock3, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { exportRunningSheetPDF } from '@/lib/runningSheetPdfExporter';
import { RunningSheetSection } from '@/components/Dashboard/RunningSheet/RunningSheetSection';
import { RunningSheetItem } from '@/types/runningSheet';
import { decodeShareToken } from '@/lib/shareTokens';
import styles from '@/components/Dashboard/RunningSheet/RunningSheetTheme.module.css';

interface RunningSheetData {
  sheet_id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_venue: string | null;
  start_time: string | null;
  finish_time: string | null;
  ceremony_date: string | null;
  ceremony_venue: string | null;
  ceremony_start_time: string | null;
  ceremony_finish_time: string | null;
  permission: string;
  items: RunningSheetItem[];
}

const formatFullDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export function RunningSheetPublicView() {
  const params = useParams<{ token: string; eventSlug?: string }>();
  const token = decodeShareToken(params.token || params.eventSlug);
  const [rowTextSize, setRowTextSize] = useState<"standard" | "larger">("standard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RunningSheetData | null>(null);
  const [resetting, setResetting] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [sectionLabel, setSectionLabel] = useState('Run Sheet');
  const [sectionNotes, setSectionNotes] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSaveRef = useRef<number>(0);
  const pendingItemPatches = useRef(new Map<string, Partial<RunningSheetItem>>());
  const undoRowIds = useRef(new Map<string, string>());
  const rowWrites = useRef(new Map<string, Promise<any>>());
  const fetchVersion = useRef(0);
  const activeToken = useRef(token); activeToken.current = token;
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const version = ++fetchVersion.current;
    if (!token) {
      setError('Invalid share link');
      setData(null);
      setLoading(false);
      return;
    }
    // Mark this fetch so realtime echoes (e.g. last_accessed_at bumps) are
    // suppressed by the < 2s guards below and don't trigger an infinite loop.
    lastSaveRef.current = Date.now();
    // Reset stale state when token changes so previous event data never flashes.
    setError(null);
    if (!opts?.silent) setLoading(true);
    try {
      const { data: result, error: fetchError } = await supabase.rpc(
        'get_running_sheet_by_token',
        { share_token: token }
      );
      if (version !== fetchVersion.current || activeToken.current !== token) return;
      if (fetchError) {
        console.error('Error fetching running sheet:', fetchError);
        setError('This link is invalid or has expired');
        setData(null);
        setLoading(false);
        return;
      }
      if (!result || result.length === 0) {
        setError('This link is invalid or has expired');
        setData(null);
        setLoading(false);
        return;
      }
      const row = result[0];
      const parsedItems = ((row.items as unknown as RunningSheetItem[]) || []).map(item => ({ ...item, sheet_id: row.sheet_id }));
      parsedItems.sort((a, b) => a.order_index - b.order_index);

      setData({
        sheet_id: row.sheet_id,
        event_id: row.event_id,
        event_name: row.event_name,
        event_date: row.event_date,
        event_venue: row.event_venue,
        start_time: row.start_time,
        finish_time: row.finish_time,
        ceremony_date: row.ceremony_date,
        ceremony_venue: row.ceremony_venue,
        ceremony_start_time: row.ceremony_start_time,
        ceremony_finish_time: row.ceremony_finish_time,
        permission: row.permission,
        items: parsedItems,
      });
      const rawLabel = row.section_label || 'Run Sheet';
      setSectionLabel(rawLabel.trim().toLowerCase() === 'running sheet' ? 'Run Sheet' : rawLabel);
      setSectionNotes(row.section_notes || null);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load run sheet');
    } finally {
      // Bump again so the post-fetch realtime echo window stays clear.
      lastSaveRef.current = Date.now();
      setLoading(false);
    }
  }, [token]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Anonymous shared links cannot rely on owner-only database realtime policies.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || saveStatus === 'saving' || Object.keys(saveTimeoutRef.current).length) return;
      if (document.activeElement?.matches('input, textarea, [contenteditable="true"]')) return;
      void fetchData({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchData, saveStatus]);

  // Realtime subscription for live sync — items
  useEffect(() => {
    if (!data?.sheet_id) return;
    const channel = supabase
      .channel(`public-rs-items:${data.sheet_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'running_sheet_items',
        filter: `sheet_id=eq.${data.sheet_id}`,
      }, () => {
        // Skip self-triggered refetches to prevent feedback loop
        if (Date.now() - lastSaveRef.current < 2000) return;
        fetchData({ silent: true });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [data?.sheet_id, fetchData]);

  // Realtime subscription for permission changes on share tokens.
  // Guard against self-triggered echoes: opening this page bumps
  // last_accessed_at on the token row, which would otherwise loop forever.
  useEffect(() => {
    if (!data?.sheet_id) return;
    const currentPermission = data.permission;
    const channel = supabase
      .channel(`public-rs-tokens:${data.sheet_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'running_sheet_share_tokens',
        filter: `sheet_id=eq.${data.sheet_id}`,
      }, (payload: any) => {
        if (Date.now() - lastSaveRef.current < 2000) return;
        // Only refetch if the permission actually changed; ignore
        // last_accessed_at / metadata-only updates.
        const newPermission = payload?.new?.permission;
        if (newPermission && newPermission !== currentPermission) {
          fetchData({ silent: true });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [data?.sheet_id, data?.permission, fetchData]);


  // Realtime subscription for running_sheets meta changes (notes, label)
  useEffect(() => {
    if (!data?.sheet_id) return;
    const channel = supabase
      .channel(`public-rs-meta:${data.sheet_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'running_sheets',
        filter: `id=eq.${data.sheet_id}`,
      }, () => {
        if (Date.now() - lastSaveRef.current < 2000) return;
        fetchData({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [data?.sheet_id, fetchData]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (saveStatus === 'saving' || Object.keys(saveTimeoutRef.current).length) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [saveStatus]);

  const canEdit = data?.permission === 'can_edit';

  // --- Token-based write operations ---

  const handleUpdateItem = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    if (!token || !canEdit) return;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      };
    });

    setSaveStatus('saving');
    pendingItemPatches.current.set(itemId, { ...pendingItemPatches.current.get(itemId), ...updates });
    // Debounced save
    const key = `update-${itemId}`;
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);

    saveTimeoutRef.current[key] = setTimeout(async () => {
      const updates = pendingItemPatches.current.get(itemId) || {};
      pendingItemPatches.current.delete(itemId);
      delete saveTimeoutRef.current[key];
      const params: any = { share_token: token, item_id: itemId };
      if (updates.time_text !== undefined) params.new_time_text = updates.time_text;
      if (updates.description_rich !== undefined) params.new_description_rich = updates.description_rich;
      if (updates.responsible !== undefined) params.new_responsible = updates.responsible;
      if (updates.is_section_header !== undefined) params.new_is_section_header = updates.is_section_header;
      if (updates.is_bold !== undefined) params.new_is_bold = updates.is_bold;
      if (updates.is_italic !== undefined) params.new_is_italic = updates.is_italic;
      if (updates.is_underline !== undefined) params.new_is_underline = updates.is_underline;

      setSaveStatus('saving');
      lastSaveRef.current = Date.now();
      const write = Promise.resolve(supabase.rpc('update_running_sheet_item_by_token', params));
      rowWrites.current.set(itemId, write);
      const { data: success, error: rpcError } = await write;
      if (rowWrites.current.get(itemId) === write) rowWrites.current.delete(itemId);
      if (rpcError) {
        console.error('Error saving item:', rpcError);
        setSaveStatus('error');
      } else if (success === false) {
        console.error('Save rejected — token may no longer have edit permission');
        setSaveStatus('error');
        fetchData();
      } else {
        setSaveStatus('saved');
        if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 300);
  }, [token, canEdit, fetchData]);

  const handleAddItem = useCallback(async () => {
    if (!token || !canEdit || !data) return;
    const nextIndex = Math.max(-1, ...data.items.map(item => item.order_index)) + 1;
    const { data: newRow, error: rpcError } = await supabase.rpc('add_running_sheet_item_by_token', {
      share_token: token,
      at_order_index: nextIndex,
    });
    if (rpcError) {
      console.error('Error adding item:', rpcError);
      return;
    }
    if (newRow) {
      // Realtime will pick it up, but also do optimistic add
      fetchData();
    }
  }, [token, canEdit, data, fetchData]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!token || !canEdit) return;
    // Optimistic removal
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter(i => i.id !== itemId) };
    });
    const { data: success, error: rpcError } = await supabase.rpc('delete_running_sheet_item_by_token', {
      share_token: token,
      item_id: itemId,
    });
    if (rpcError || success !== true) {
      setSaveStatus('error');
      console.error('Error deleting item:', rpcError);
      fetchData();
    }
  }, [token, canEdit, fetchData]);

  const handleRestoreItems = useCallback(async (rows: RunningSheetItem[]) => {
    if (!token || !canEdit || !data || rows.some(row => row.sheet_id !== data.sheet_id)) return null;
    setSaveStatus('saving');
    try {
      // Cancel superseded debounced edits and wait for writes already in flight.
      for (const row of rows) {
        clearTimeout(saveTimeoutRef.current[`update-${row.id}`]);
        delete saveTimeoutRef.current[`update-${row.id}`];
        pendingItemPatches.current.delete(row.id);
      }
      await Promise.all([...rowWrites.current.values()]);
      if (activeToken.current !== token) return null;
      const current = await supabase.rpc('get_running_sheet_by_token', { share_token: token });
      const sheet = Array.isArray(current.data) ? current.data[0] : current.data;
      if (current.error || !sheet || sheet.permission !== 'can_edit') throw new Error('Edit access unavailable');
      const existing = (sheet.items || []) as unknown as RunningSheetItem[];
      const restored: RunningSheetItem[] = [];
      for (const row of rows) {
        if (activeToken.current !== token) return null;
        let id = undoRowIds.current.get(`${token}:${row.id}`) || row.id;
        if (!existing.some(item => item.id === id)) {
          const added = await supabase.rpc('add_running_sheet_item_by_token', { share_token: token, at_order_index: row.order_index });
          const created = added.data as { id?: string } | null;
          if (added.error || !created?.id) throw new Error('Row not restored');
          id = created.id;
          // Retain the ID on partial failure, so retry updates it rather than creating duplicates.
          undoRowIds.current.set(`${token}:${row.id}`, id);
        }
        lastSaveRef.current = Date.now();
        const saved = await supabase.rpc('update_running_sheet_item_by_token', {
          share_token: token, item_id: id, new_time_text: row.time_text,
          new_description_rich: row.description_rich, new_responsible: row.responsible || '',
          new_is_section_header: row.is_section_header, new_is_bold: !!row.is_bold,
          new_is_italic: !!row.is_italic, new_is_underline: !!row.is_underline,
        });
        if (saved.error || saved.data !== true) throw new Error('Row not saved');
        restored.push({ ...row, id });
      }
      const merged = [...existing.filter(item => !restored.some(row => row.id === item.id)), ...restored].sort((a,b) => a.order_index-b.order_index);
      const ordered = await supabase.rpc('reorder_running_sheet_items_by_token', { share_token: token, item_ids: merged.map(row => row.id) });
      if (ordered.error || ordered.data !== true) throw new Error('Order not saved');
      if (activeToken.current !== token) return null;
      setData(prev => prev?.sheet_id === data.sheet_id ? { ...prev, items: merged } : prev);
      setSaveStatus('saved');
      return restored;
    } catch {
      if (activeToken.current === token) { setSaveStatus('error'); await fetchData({ silent: true }); }
      return null;
    }
  }, [token, canEdit, data, fetchData]);

  const handleDuplicateItem = useCallback(async (item: RunningSheetItem) => {
    if (!token || !canEdit) return;
    const { data: newRow, error: rpcError } = await supabase.rpc('duplicate_running_sheet_item_by_token', {
      share_token: token,
      item_id: item.id,
    });
    if (rpcError) {
      console.error('Error duplicating item:', rpcError);
      return;
    }
    if (newRow && data) {
      const ordered = [...data.items];
      ordered.splice(ordered.findIndex(row => row.id === item.id) + 1, 0, newRow as unknown as RunningSheetItem);
      const { data: success, error } = await supabase.rpc('reorder_running_sheet_items_by_token', {
        share_token: token, item_ids: ordered.map(row => row.id),
      });
      if (error || success !== true) setSaveStatus('error');
      fetchData();
    }
  }, [token, canEdit, data, fetchData]);

  const handleReorderItems = useCallback(async (reorderedItems: RunningSheetItem[]) => {
    if (!token || !canEdit) return;
    // Optimistic reorder
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, items: reorderedItems };
    });
    const itemIds = reorderedItems.map(i => i.id);
    const { data: success, error: rpcError } = await supabase.rpc('reorder_running_sheet_items_by_token', {
      share_token: token,
      item_ids: itemIds,
    });
    if (rpcError || success !== true) {
      setSaveStatus('error');
      console.error('Error reordering items:', rpcError);
      fetchData();
    }
  }, [token, canEdit, fetchData]);

  // Save section label/notes via token-based RPC
  const handleLabelChange = useCallback((label: string) => {
    setSectionLabel(label);
    if (!token || !canEdit) return;
    setSaveStatus('saving');
    const key = 'meta-label';
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);
    saveTimeoutRef.current[key] = setTimeout(async () => {
      delete saveTimeoutRef.current[key];
      setSaveStatus('saving');
      lastSaveRef.current = Date.now();
      const { data: success, error: rpcError } = await supabase.rpc('update_running_sheet_meta_by_token', {
        share_token: token,
        new_section_label: label,
      });
      if (rpcError || success === false) {
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
        if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 500);
  }, [token, canEdit]);

  const handleNotesChange = useCallback((notes: string | null) => {
    setSectionNotes(notes);
    if (!token || !canEdit) return;
    setSaveStatus('saving');
    const key = 'meta-notes';
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);
    saveTimeoutRef.current[key] = setTimeout(async () => {
      delete saveTimeoutRef.current[key];
      setSaveStatus('saving');
      lastSaveRef.current = Date.now();
      const { data: success, error: rpcError } = await supabase.rpc('update_running_sheet_meta_by_token', {
        share_token: token,
        new_section_notes: notes || '',
      });
      if (rpcError || success === false) {
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
        if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 500);
  }, [token, canEdit]);

  const handleResetToDefault = useCallback(async () => {
    if (!token || !canEdit || !data) return;
    if (saveStatus === 'saving' || resetting) return;
    setResetting(true);
    setSaveStatus('saving');
    const created: string[] = [];
    try {
      for (const row of DEFAULT_RUNNING_SHEET_ROWS) {
        const { data: added, error } = await supabase.rpc('add_running_sheet_item_by_token', {
          share_token: token, at_order_index: row.order_index,
        });
        const addedId = added && typeof added === 'object' && !Array.isArray(added) && typeof added.id === 'string' ? added.id : null;
        if (error || !addedId) throw new Error('Default row could not be added');
        created.push(addedId);
        const { data: saved, error: writeError } = await supabase.rpc('update_running_sheet_item_by_token', {
          share_token: token, item_id: addedId, new_time_text: row.time_text,
          new_description_rich: row.description_rich, new_responsible: row.responsible,
          new_is_section_header: row.is_section_header,
        });
        if (writeError || saved !== true) throw new Error('Default row could not be saved');
      }
    } catch {
      await Promise.allSettled(created.map(id => supabase.rpc('delete_running_sheet_item_by_token', {share_token:token,item_id:id})));
      setResetting(false);
      setSaveStatus('error');
      await fetchData({silent:true});
      return;
    }
    try {
    const deleted = await Promise.all(data.items.map(item => supabase.rpc('delete_running_sheet_item_by_token', {share_token:token,item_id:item.id})));
    if (deleted.some(result => result.error || result.data !== true)) { setSaveStatus('error'); await fetchData({silent:true}); return; }
    const {data: saved, error} = await supabase.rpc('update_running_sheet_meta_by_token', {share_token:token,new_section_label:'Run Sheet',new_section_notes:''});
    setSaveStatus(error || saved !== true ? 'error' : 'saved');
    await fetchData({silent:true});
    } catch { setSaveStatus('error'); await fetchData({silent:true}); } finally { setResetting(false); }
  }, [token, canEdit, data, saveStatus, resetting, fetchData]);

  if (loading) {
    return (
      <div className={`${styles.publicPage} ${styles.page} ww-application-background flex items-center justify-center p-4`} data-public-running-sheet-state="loading">
        <div className={`${styles.statusCard} rounded-2xl p-8 text-center`}>
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading run sheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.publicPage} ${styles.page} ww-application-background flex items-center justify-center p-4`} data-public-running-sheet-state="unavailable">
        <Card className={styles.statusCard}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Unavailable</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the person who shared this link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const hasCeremony = !!(data.ceremony_date || data.ceremony_venue);
  const hasReception = !!(data.event_date || data.event_venue);

  return (
    <div className={`${styles.publicPage} ${styles.page} ww-application-background`} data-public-running-sheet-state="ready" data-running-sheet-page>
      {/* Header */}
      <header className={`${styles.publicHeader} print:static`}>
        <div className="w-full max-w-[96%] mx-auto px-4 2xl:max-w-[1800px] py-4">
          <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
            <div className="flex items-center gap-3">
              <div className={`${styles.publicHeaderIcon} p-2 bg-primary/10 rounded-lg`}>
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Run Sheet</h1>
                <p className="text-sm text-muted-foreground">Organise the perfect schedule for your wedding or event</p>
                <p className="text-sm mt-4">Event: {data.event_name}</p>
              </div>
            </div>
            <div data-export-controls-panel className={`border rounded-xl p-3 flex items-center gap-3 flex-wrap print:hidden max-sm:[&>*]:w-full ${styles.exportPanel}`}>
              <span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span>
              {canEdit && saveStatus !== 'idle' && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-opacity ${
                  saveStatus === 'saving' ? 'text-muted-foreground bg-muted' :
                  saveStatus === 'saved' ? 'text-green-600 bg-green-50' :
                  'text-destructive bg-destructive/10'
                }`}>
                  {saveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {saveStatus === 'saved' && <Check className="h-3 w-3" />}
                  {saveStatus === 'error' && <CloudOff className="h-3 w-3" />}
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save failed'}
                </span>
              )}
              <span
                className={`${styles.permissionBadge} inline-flex items-center px-4 py-2 text-sm font-medium border-2 rounded-full ${
                canEdit
                  ? 'border-green-500 text-green-600'
                  : 'border-red-500 text-red-500'
                }`}
                data-permission={canEdit ? 'can-edit' : 'view-only'}
              >
                {canEdit ? 'Can Edit' : 'View Only'}
              </span>
              <button
                className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-all disabled:opacity-50 ${styles.greenAction}`}
                disabled={downloadingPDF}
                onClick={async () => {
                  setDownloadingPDF(true);
                  try {
                    const eventObj = {
                      id: data.event_id,
                      name: data.event_name,
                      date: data.event_date,
                      venue: data.event_venue,
                      start_time: data.start_time,
                      finish_time: data.finish_time,
                      ceremony_date: data.ceremony_date,
                      ceremony_venue: data.ceremony_venue,
                      ceremony_start_time: data.ceremony_start_time,
                      ceremony_finish_time: data.ceremony_finish_time,
                    };
                    await exportRunningSheetPDF(data.items as any, eventObj, sectionLabel, sectionNotes, rowTextSize);
                  } catch (err) {
                    console.error('PDF export error:', err);
                  } finally {
                    setDownloadingPDF(false);
                  }
                }}
              >
                {downloadingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Event details use the same markup and classes as the owner workspace. */}
      {(hasCeremony || hasReception) && <div>
            <div className={`text-center py-4 px-4 space-y-3 ${styles.eventBanner}`}>
              <h2 className="text-xl font-semibold text-primary">{data.event_name}</h2>
              <div className={`flex justify-center gap-8 flex-wrap ${
                hasCeremony && hasReception ? '' : 'max-w-md mx-auto'
              }`}>
                {hasCeremony && (
                  <div className="text-left min-w-[280px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <HeartHandshake size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${styles.eventDetailLabel}`}>Ceremony:</span>
                      <CalendarDays size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className={`text-muted-foreground ${styles.eventDetailText}`}>{formatFullDate(data.ceremony_date)}</span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 ${styles.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span>Start: {formatTimeDisplay(data.ceremony_start_time)} — Finish: {formatTimeDisplay(data.ceremony_finish_time)}</span>
                    </div>
                    {data.ceremony_venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 ${styles.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        <span>{data.ceremony_venue}</span>
                      </div>
                    )}
                  </div>
                )}
                {hasReception && (
                  <div className="text-left min-w-[280px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PartyPopper size={16} strokeWidth={1.8} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={`font-semibold text-primary ${styles.eventDetailLabel}`}>Reception:</span>
                      <CalendarDays size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className={`text-muted-foreground ${styles.eventDetailText}`}>{formatFullDate(data.event_date)}</span>
                    </div>
                    <div className={`text-muted-foreground mt-1 flex items-center gap-1.5 ${styles.eventDetailText}`}>
                      <Clock3 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span>Start: {formatTimeDisplay(data.start_time)} — Finish: {formatTimeDisplay(data.finish_time)}</span>
                    </div>
                    {data.event_venue && (
                      <div className={`text-muted-foreground flex items-center gap-1.5 ${styles.eventDetailText}`}>
                        <MapPin size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        <span>{data.event_venue}</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
      </div>}

      {/* Running Sheet — using same components as dashboard */}
      <main className="w-full max-w-[96%] mx-auto px-4 2xl:max-w-[1800px] py-6">
        <RunningSheetSection
            rowTextSize={rowTextSize}
            onRowTextSizeChange={setRowTextSize}
            key={token}
            onRestoreItems={handleRestoreItems}
          label={sectionLabel}
          onLabelChange={handleLabelChange}
          notes={sectionNotes}
          onNotesChange={handleNotesChange}
          items={data.items}
          onUpdateItem={handleUpdateItem}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
          onDuplicateItem={handleDuplicateItem}
          onReorderItems={handleReorderItems}
          allowReset={!resetting && saveStatus !== 'saving'}
              onResetToDefault={handleResetToDefault}
          hasDJMCData={false}
          readOnly={!canEdit}
          disabled={!canEdit || resetting}
        />
      </main>

      {/* Footer */}
      <footer className={`${styles.publicFooter} border-t border-border mt-12 print:border-0`}>
        <div className="w-full max-w-[96%] mx-auto px-4 2xl:max-w-[1800px] py-6 text-center">
          <a href="https://www.weddingwaitress.com.au" target="_blank" rel="noopener noreferrer" className="inline-flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
            <img
              src="/wedding-waitress-logo-brown.png"
              alt="Wedding Waitress"
              width={160}
              height={40}
              className="h-10 w-auto"
            />
            <p className="text-xs text-muted-foreground">
              Powered by Wedding Waitress
            </p>
          </a>
        </div>
      </footer>
    </div>
  );
}
