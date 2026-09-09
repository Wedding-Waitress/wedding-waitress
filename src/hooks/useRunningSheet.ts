/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This Running Sheet feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break running sheet data, sharing, or PDF export
 * - Includes in-memory cache for instant tab-switch loading
 *
 * Last locked: 2026-04-02
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RunningSheetItem, RunningSheetShareToken } from '@/types/runningSheet';
import { registerCache, registerEventCache } from '@/lib/cacheRegistry';

interface RunningSheetData {
  id: string;
  event_id: string;
  user_id: string;
  items: RunningSheetItem[];
}

import { DEFAULT_RUNNING_SHEET_ROWS as DEFAULT_ROWS } from '@/lib/runningSheetDefaults';


// Module-level cache so data persists across tab switches / remounts
const sheetCache = new Map<string, { sheet: RunningSheetData; sectionLabel: string; sectionNotes: string | null; shareTokens: RunningSheetShareToken[] }>();
registerCache(() => { sheetCache.clear(); });
registerEventCache((eventId) => { sheetCache.delete(eventId); });

// Self-save cooldown: ignore realtime events within this window after a local save
const SELF_SAVE_COOLDOWN_MS = 2000;

export function useRunningSheet(eventId: string | null) {
  const cached = eventId ? sheetCache.get(eventId) : undefined;
  const [sheet, setSheet] = useState<RunningSheetData | null>(cached?.sheet ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionLabel, setSectionLabel] = useState(
    (cached?.sectionLabel?.trim().toLowerCase() === 'running sheet' ? 'Run Sheet' : cached?.sectionLabel) ?? 'Run Sheet'
  );
  const [sectionNotes, setSectionNotes] = useState<string | null>(cached?.sectionNotes ?? null);
  const [shareTokens, setShareTokens] = useState<RunningSheetShareToken[]>(cached?.shareTokens ?? []);
  const { toast } = useToast();

  // Self-save guard: tracks last local save timestamp
  const lastSaveRef = useRef<number>(0);

  // Per-item debounce timers keyed by item id
  const itemSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingItems = useRef(new Map<string, Partial<RunningSheetItem>>());
  const pendingCallbacks = useRef(new Map<string, () => Promise<void>>());
  const pendingMeta = useRef(new Map<string, Record<string, unknown>>());
  const metaTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveChains = useRef(new Map<string, Promise<void>>());
  const fetchVersion = useRef(0);
  const activeEvent = useRef(eventId);
  activeEvent.current = eventId;
  // Meta (label/notes) debounce timer


  // Keep cache in sync whenever state changes
  useEffect(() => {
    if (eventId && sheet?.event_id === eventId) {
      sheetCache.set(eventId, { sheet, sectionLabel, sectionNotes, shareTokens });
    }
  }, [eventId, sheet, sectionLabel, sectionNotes, shareTokens]);

  // Flush pending saves when navigating away rather than discarding edits.
  useEffect(() => () => {
    itemSaveTimers.current.forEach(clearTimeout);
    metaTimers.current.forEach(clearTimeout);
    pendingCallbacks.current.forEach(save => { void save(); });
  }, [eventId]);

  const runSave = useCallback((key: string, write: () => Promise<void>) => {
    const next = (saveChains.current.get(key) || Promise.resolve()).catch(() => {}).then(write).catch(() => {
      toast({ title: 'Changes not saved', description: 'Please check your connection and try again.', variant: 'destructive' });
    });
    saveChains.current.set(key, next);
    return next.finally(() => {
      if (saveChains.current.get(key) === next) saveChains.current.delete(key);
      setSaving(pendingCallbacks.current.size > 0 || saveChains.current.size > 0);
    });
  }, [toast]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (pendingCallbacks.current.size || saveChains.current.size) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);

  const fetchSheet = useCallback(async () => {
    const version = ++fetchVersion.current;
    if (!eventId) { setSheet(null); setShareTokens([]); return; }
    // Only show loading spinner if we have NO cached data
    const hasCached = sheetCache.has(eventId);
    if (!hasCached) setLoading(true);
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('running_sheets')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      let sheetId: string;
      if (existing) {
        sheetId = existing.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data: newSheet, error: createErr } = await supabase
          .from('running_sheets')
          .insert({ event_id: eventId, user_id: user.id, show_responsible: true })
          .select()
          .single();
        if (createErr) throw createErr;
        sheetId = newSheet.id;

        // Create default rows
        const rowsToInsert = DEFAULT_ROWS.map(r => ({ ...r, sheet_id: sheetId }));
        const { error: defaultsError } = await supabase.from('running_sheet_items').insert(rowsToInsert);
        if (defaultsError) {
          await supabase.from('running_sheets').delete().eq('id', sheetId);
          throw defaultsError;
        }
      }

      // Fetch items
      const { data: items, error: itemsErr } = await supabase
        .from('running_sheet_items')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('order_index');
      if (itemsErr) throw itemsErr;

      const { data: sheetData } = await supabase
        .from('running_sheets')
        .select('*')
        .eq('id', sheetId)
        .single();

      if (version !== fetchVersion.current || activeEvent.current !== eventId) return;
      setSheet({ id: sheetId, event_id: eventId, user_id: sheetData?.user_id || '', items: items || [] });
      if (sheetData?.section_label != null) {
        const lbl = sheetData.section_label || 'Run Sheet';
        setSectionLabel(lbl.trim().toLowerCase() === 'running sheet' ? 'Run Sheet' : lbl);
      }
      if (sheetData?.section_notes !== undefined) setSectionNotes(sheetData.section_notes);

      // Fetch share tokens
      const { data: tokens } = await supabase
        .from('running_sheet_share_tokens')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('created_at', { ascending: false });
      if (version === fetchVersion.current && activeEvent.current === eventId) setShareTokens((tokens as RunningSheetShareToken[]) || []);
    } catch (error) {
      console.error('Error fetching running sheet:', error);
      toast({ title: 'Error', description: 'Failed to load running sheet', variant: 'destructive' });
    } finally {
      if (version === fetchVersion.current) setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => { fetchSheet(); }, [fetchSheet]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || document.activeElement?.matches('input, textarea, [contenteditable="true"]')) return;
      if (!pendingCallbacks.current.size && !saveChains.current.size) void fetchSheet();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchSheet]);

  // Realtime subscription for running_sheet_items changes (e.g. edits from shared links)
  // Uses self-save guard to prevent feedback loop when we edit locally
  useEffect(() => {
    if (!sheet?.id) return;
    const channel = supabase
      .channel(`dashboard-rs-items:${sheet.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'running_sheet_items',
        filter: `sheet_id=eq.${sheet.id}`,
      }, () => {
        // Ignore realtime events caused by our own recent saves
        if (Date.now() - lastSaveRef.current < SELF_SAVE_COOLDOWN_MS) {
          return;
        }
        // External change (vendor via shared link) — sync it in
        fetchSheet();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sheet?.id, fetchSheet]);

  // Realtime subscription for running_sheets meta changes (label, notes)
  useEffect(() => {
    if (!sheet?.id) return;
    const channel = supabase
      .channel(`dashboard-rs-meta:${sheet.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'running_sheets',
        filter: `id=eq.${sheet.id}`,
      }, () => {
        if (Date.now() - lastSaveRef.current < SELF_SAVE_COOLDOWN_MS) return;
        fetchSheet();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sheet?.id, fetchSheet]);

  const saveMetaToDb = useCallback((updates: Record<string, unknown>) => {
    if (!sheet || sheet.event_id !== eventId) return;
    const sheetId = sheet.id;
    const key = 'meta-' + sheetId;
    pendingMeta.current.set(sheetId, { ...pendingMeta.current.get(sheetId), ...updates });
    clearTimeout(metaTimers.current.get(sheetId));
    setSaving(true);
    const save = async () => {
      pendingCallbacks.current.delete(key);
      metaTimers.current.delete(sheetId);
      const patch = pendingMeta.current.get(sheetId);
      pendingMeta.current.delete(sheetId);
      if (!patch) return;
      await runSave(key, async () => {
        lastSaveRef.current = Date.now();
        const { error } = await supabase.from('running_sheets').update(patch).eq('id', sheetId);
        if (error) toast({ title: 'Notes or heading not saved', description: 'Please try your change again.', variant: 'destructive' });
      });
    };
    pendingCallbacks.current.set(key, save);
    metaTimers.current.set(sheetId, setTimeout(save, 500));
  }, [sheet, eventId, toast, runSave]);

  const handleSetSectionLabel = useCallback((label: string) => {
    setSectionLabel(label);
    saveMetaToDb({ section_label: label });
  }, [saveMetaToDb]);
  const handleSetSectionNotes = useCallback((notes: string | null) => {
    setSectionNotes(notes);
    saveMetaToDb({ section_notes: notes });
  }, [saveMetaToDb]);

  const saveItemToDb = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    pendingItems.current.set(itemId, { ...pendingItems.current.get(itemId), ...updates });
    clearTimeout(itemSaveTimers.current.get(itemId));
    setSaving(true);
    const save = async () => {
      pendingCallbacks.current.delete(itemId);
      itemSaveTimers.current.delete(itemId);
      const patch = pendingItems.current.get(itemId);
      pendingItems.current.delete(itemId);
      if (!patch) return;
      await runSave(itemId, async () => {
        lastSaveRef.current = Date.now();
        const { error } = await supabase.from('running_sheet_items').update(patch).eq('id', itemId);
        if (error) toast({ title: 'Row not saved', description: 'Please try your change again.', variant: 'destructive' });
      });
    };
    pendingCallbacks.current.set(itemId, save);
    itemSaveTimers.current.set(itemId, setTimeout(save, 300));
  }, [toast, runSave]);

  const updateItem = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    if (!sheet || sheet.event_id !== activeEvent.current || !sheet.items.some(item => item.id === itemId)) return;
    setSheet(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, ...updates } : i) };
    });
    saveItemToDb(itemId, updates);
  }, [sheet, saveItemToDb]);

  const addItem = useCallback(async () => {
    if (!sheet || sheet.event_id !== activeEvent.current) return;
    const newOrderIndex = Math.max(-1, ...sheet.items.map(item => item.order_index)) + 1;
    try {
      lastSaveRef.current = Date.now();
      const { data: newItem, error } = await supabase
        .from('running_sheet_items')
        .insert({ sheet_id: sheet.id, order_index: newOrderIndex, time_text: '', description_rich: { text: '' }, responsible: '', is_section_header: false })
        .select()
        .single();
      if (error) throw error;
      setSheet(prev => prev ? { ...prev, items: [...prev.items, newItem as RunningSheetItem] } : prev);
    } catch (error) {
      console.error('Error adding item:', error);
      toast({ title: 'Error', description: 'Failed to add row', variant: 'destructive' });
    }
  }, [sheet, toast]);

  const deleteItem = useCallback(async (itemId: string) => {
    try {
      lastSaveRef.current = Date.now();
      const { error } = await supabase.from('running_sheet_items').delete().eq('id', itemId);
      if (error) throw error;
      setSheet(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: 'Error', description: 'Failed to delete row', variant: 'destructive' });
    }
  }, [toast]);

  const restoreItems = useCallback(async (rows: RunningSheetItem[]) => {
    if (!sheet || sheet.event_id !== activeEvent.current || rows.some(row => row.sheet_id !== sheet.id)) return null;
    const sheetId = sheet.id;
    try {
      await Promise.all([...pendingCallbacks.current.values()].map(save => save()));
      await Promise.all([...saveChains.current.values()]);
      if (sheet.event_id !== activeEvent.current) return null;
      lastSaveRef.current = Date.now();
      const payload = rows.map(({ id, order_index, time_text, description_rich, responsible, is_section_header, is_bold, is_italic, is_underline }) => ({
        id, sheet_id: sheetId, order_index, time_text, description_rich, responsible, is_section_header,
        is_bold: !!is_bold, is_italic: !!is_italic, is_underline: !!is_underline,
      }));
      const { data: saved, error } = await supabase.from('running_sheet_items').upsert(payload).select();
      if (error || !saved || saved.length !== rows.length) throw error || new Error('Rows not restored');
      const restored = rows.map(row => saved.find(item => item.id === row.id) as RunningSheetItem);
      if (restored.some(row => !row)) throw new Error('Incomplete restore');
      setSheet(prev => prev?.id === sheetId ? { ...prev, items: [...prev.items.filter(item => !rows.some(row => row.id === item.id)), ...restored].sort((a,b) => a.order_index-b.order_index) } : prev);
      return restored;
    } catch {
      toast({ title: 'Undo not saved', description: 'Please try Undo again.', variant: 'destructive' });
      return null;
    }
  }, [sheet, toast]);

  const duplicateItem = useCallback(async (item: RunningSheetItem) => {
    if (!sheet || sheet.event_id !== activeEvent.current) return;
    try {
      lastSaveRef.current = Date.now();
      const { data: newItem, error } = await supabase
        .from('running_sheet_items')
        .insert({
          sheet_id: sheet.id,
          order_index: Math.max(-1, ...sheet.items.map(row => row.order_index)) + 1,
          time_text: item.time_text,
          description_rich: item.description_rich,
          responsible: item.responsible,
          is_section_header: item.is_section_header,
          is_bold: item.is_bold, is_italic: item.is_italic, is_underline: item.is_underline,
        })
        .select()
        .single();
      if (error) throw error;

      const ordered = [...sheet.items];
      ordered.splice(ordered.findIndex(row => row.id === item.id) + 1, 0, newItem as RunningSheetItem);
      const results = await Promise.all(ordered.map((row, index) => supabase.from('running_sheet_items').update({ order_index: index }).eq('id', row.id)));
      if (results.some(result => result.error)) { await fetchSheet(); throw new Error('Duplicate order not saved'); }
      setSheet(prev => prev?.id === sheet.id ? { ...prev, items: ordered.map((row,index) => ({...row, order_index:index})) } : prev);
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({ title: 'Error', description: 'Failed to duplicate row', variant: 'destructive' });
    }
  }, [sheet, toast, fetchSheet]);

  const reorderItems = useCallback(async (items: RunningSheetItem[]) => {
    setSheet(prev => prev ? { ...prev, items: items.map((item,index) => ({...item, order_index:index})) } : prev);
    try {
      lastSaveRef.current = Date.now();
      const results = await Promise.all(items.map((item, index) =>
        supabase.from('running_sheet_items').update({ order_index: index }).eq('id', item.id)
      ));
      if (results.some(result => result.error)) throw new Error('Order update failed');
    } catch (error) {
      toast({ title: 'Order not saved', description: 'Please try again.', variant: 'destructive' });
      console.error('Error reordering items:', error);
    }
  }, [toast]);

  const resetToDefault = useCallback(async () => {
    if (!sheet || sheet.event_id !== activeEvent.current) return;
    try {
      lastSaveRef.current = Date.now();
      await Promise.all([...pendingCallbacks.current.values()].map(save => save()));
      const rowsToInsert = DEFAULT_ROWS.map(r => ({ ...r, sheet_id: sheet.id }));
      const { data: newItems, error } = await supabase.from('running_sheet_items').insert(rowsToInsert).select();
      if (error) throw error;
      const oldIds = sheet.items.map(item => item.id);
      if (oldIds.length) {
        const { error: deleteError } = await supabase.from('running_sheet_items').delete().in('id', oldIds);
        if (deleteError) {
          await supabase.from('running_sheet_items').delete().in('id', newItems.map(item => item.id));
          throw deleteError;
        }
      }
      setSheet(prev => prev ? { ...prev, items: newItems as RunningSheetItem[] } : prev);
      setSectionLabel('Run Sheet');
      setSectionNotes(null);
      saveMetaToDb({ section_label: 'Run Sheet', section_notes: null });
      toast({ title: 'Reset Complete', description: 'Section has been reset to defaults' });
    } catch (error) {
      console.error('Error resetting:', error);
      toast({ title: 'Error', description: 'Failed to reset section', variant: 'destructive' });
    }
  }, [sheet, toast, saveMetaToDb]);

  const generateShareToken = useCallback(async (
    permission: 'view_only' | 'can_edit',
    recipientName?: string,
    validityDays?: number
  ): Promise<string | null> => {
    if (!sheet) return null;
    try {
      const { data, error } = await supabase.rpc('generate_running_sheet_share_token', {
        _sheet_id: sheet.id,
        _permission: permission,
        _recipient_name: recipientName || null,
        _validity_days: validityDays || 90,
      });
      if (error) throw error;
      // Refresh tokens
      const { data: tokens } = await supabase
        .from('running_sheet_share_tokens')
        .select('*')
        .eq('sheet_id', sheet.id)
        .order('created_at', { ascending: false });
      setShareTokens((tokens as RunningSheetShareToken[]) || []);
      return data as string;
    } catch (error) {
      console.error('Error generating share token:', error);
      toast({ title: 'Error', description: 'Failed to generate share link', variant: 'destructive' });
      return null;
    }
  }, [sheet, toast]);

  const deleteShareToken = useCallback(async (tokenId: string) => {
    try {
      const { error } = await supabase.from('running_sheet_share_tokens').delete().eq('id', tokenId);
      if (error) throw error;
      setShareTokens(prev => prev.filter(t => t.id !== tokenId));
      toast({ title: 'Deleted', description: 'Share link removed' });
    } catch (error) {
      console.error('Error deleting share token:', error);
      toast({ title: 'Error', description: 'Failed to delete share link', variant: 'destructive' });
    }
  }, [toast]);

  const refreshShareTokens = useCallback(async () => {
    if (!sheet || sheet.event_id !== activeEvent.current) return;
    const { data: tokens } = await supabase
      .from('running_sheet_share_tokens')
      .select('*')
      .eq('sheet_id', sheet.id)
      .order('created_at', { ascending: false });
    setShareTokens((tokens as RunningSheetShareToken[]) || []);
  }, [sheet]);

  return {
    sheet: sheet?.event_id === eventId ? sheet : null,
    loading,
    saving,
    sectionLabel,
    setSectionLabel: handleSetSectionLabel,
    sectionNotes,
    setSectionNotes: handleSetSectionNotes,
    shareTokens,
    updateItem,
    addItem,
    deleteItem,
    restoreItems,
    duplicateItem,
    reorderItems,
    resetToDefault,
    generateShareToken,
    deleteShareToken,
    refreshShareTokens,
  };
}
