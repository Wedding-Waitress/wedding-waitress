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

interface RunningSheetData {
  id: string;
  event_id: string;
  user_id: string;
  items: RunningSheetItem[];
}

const DEFAULT_ROWS: Omit<RunningSheetItem, 'id' | 'sheet_id' | 'created_at' | 'updated_at'>[] = [
  { order_index: 0, time_text: '3.00 PM', description_rich: { text: 'Guests Arrive' }, responsible: '', is_section_header: false },
  { order_index: 1, time_text: '3.30 PM', description_rich: { text: 'Ceremony' }, responsible: 'Celebrant', is_section_header: true },
  { order_index: 2, time_text: '4.00 PM', description_rich: { text: 'Group & Family Photos' }, responsible: 'Photographer', is_section_header: false },
  { order_index: 3, time_text: '4.30 PM', description_rich: { text: 'Pre-Dinner Drinks & Canapés' }, responsible: 'Venue', is_section_header: false },
  { order_index: 4, time_text: '6.00 PM', description_rich: { text: 'Reception doors open & Guests Seated' }, responsible: 'Venue', is_section_header: true },
  { order_index: 5, time_text: '6.30 PM', description_rich: { text: 'Bridal Party Introduction', subText: '(Use the DJ-MC Questionnaire to organise the Bridal Party Introduction. You can sync it here.)' }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 6, time_text: '7.00 PM', description_rich: { text: 'Entrée Served' }, responsible: 'Venue', is_section_header: true },
  { order_index: 7, time_text: '7.30 PM', description_rich: { text: '', bullets: ['Cake Cutting & Toasting for Photos', 'Bridal Dance', 'Bridal Party Dance with Wedding Couple', 'Dance Floor Open for All Guests'] }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 8, time_text: '8.00 PM', description_rich: { text: 'Main Meals Served' }, responsible: 'Venue', is_section_header: true },
  { order_index: 9, time_text: '8.30 PM', description_rich: { text: 'Speeches', subText: '(Use the DJ-MC Questionnaire to organise Speeches. You can sync it here.)' }, responsible: 'MC\nPhotographer & Video', is_section_header: false },
  { order_index: 10, time_text: '9.00 PM', description_rich: { text: 'Games then Dance Bracket', bullets: ['The Shoe Game', 'The Photo Dash', 'Dance Floor opened'] }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 11, time_text: '10.30 PM', description_rich: { text: '', bullets: ['Flower Toss', 'Garter Toss', 'Farewell Circle or Arch!'] }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 12, time_text: '11.00 PM', description_rich: { text: 'Conclusion' }, responsible: '', is_section_header: true },
];

// Module-level cache so data persists across tab switches / remounts
const sheetCache = new Map<string, { sheet: RunningSheetData; sectionLabel: string; sectionNotes: string | null; shareTokens: RunningSheetShareToken[] }>();

// Self-save cooldown: ignore realtime events within this window after a local save
const SELF_SAVE_COOLDOWN_MS = 2000;

export function useRunningSheet(eventId: string | null) {
  const cached = eventId ? sheetCache.get(eventId) : undefined;
  const [sheet, setSheet] = useState<RunningSheetData | null>(cached?.sheet ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionLabel, setSectionLabel] = useState(cached?.sectionLabel ?? 'Running Sheet');
  const [sectionNotes, setSectionNotes] = useState<string | null>(cached?.sectionNotes ?? null);
  const [shareTokens, setShareTokens] = useState<RunningSheetShareToken[]>(cached?.shareTokens ?? []);
  const { toast } = useToast();

  // Self-save guard: tracks last local save timestamp
  const lastSaveRef = useRef<number>(0);

  // Per-item debounce timers keyed by item id
  const itemSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Keep cache in sync whenever state changes
  useEffect(() => {
    if (eventId && sheet) {
      sheetCache.set(eventId, { sheet, sectionLabel, sectionNotes, shareTokens });
    }
  }, [eventId, sheet, sectionLabel, sectionNotes, shareTokens]);

  // Cleanup per-item timers on unmount
  useEffect(() => {
    return () => {
      itemSaveTimers.current.forEach(timer => clearTimeout(timer));
      itemSaveTimers.current.clear();
    };
  }, []);

  const fetchSheet = useCallback(async () => {
    if (!eventId) { setSheet(null); return; }
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
        await supabase.from('running_sheet_items').insert(rowsToInsert);
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

      setSheet({ id: sheetId, event_id: eventId, user_id: sheetData?.user_id || '', items: items || [] });

      // Fetch share tokens
      const { data: tokens } = await supabase
        .from('running_sheet_share_tokens')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('created_at', { ascending: false });
      setShareTokens((tokens as RunningSheetShareToken[]) || []);
    } catch (error) {
      console.error('Error fetching running sheet:', error);
      toast({ title: 'Error', description: 'Failed to load running sheet', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => { fetchSheet(); }, [fetchSheet]);

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

  // Per-item debounced save (300ms, keyed by item id)
  const saveItemToDb = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    // Clear any existing timer for this item
    const existing = itemSaveTimers.current.get(itemId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      itemSaveTimers.current.delete(itemId);
      lastSaveRef.current = Date.now();
      setSaving(true);
      try {
        const { error } = await supabase.from('running_sheet_items').update(updates).eq('id', itemId);
        if (error) throw error;
      } catch (error) {
        console.error('Error saving item:', error);
      } finally {
        setSaving(false);
      }
    }, 300);

    itemSaveTimers.current.set(itemId, timer);
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    setSheet(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, ...updates } : i) };
    });
    saveItemToDb(itemId, updates);
  }, [saveItemToDb]);

  const addItem = useCallback(async () => {
    if (!sheet) return;
    const newOrderIndex = sheet.items.length;
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

  const duplicateItem = useCallback(async (item: RunningSheetItem) => {
    if (!sheet) return;
    try {
      lastSaveRef.current = Date.now();
      const { data: newItem, error } = await supabase
        .from('running_sheet_items')
        .insert({
          sheet_id: sheet.id,
          order_index: item.order_index + 1,
          time_text: item.time_text,
          description_rich: item.description_rich,
          responsible: item.responsible,
          is_section_header: false,
        })
        .select()
        .single();
      if (error) throw error;

      setSheet(prev => {
        if (!prev) return prev;
        const idx = prev.items.findIndex(i => i.id === item.id);
        const newItems = [...prev.items];
        newItems.splice(idx + 1, 0, newItem as RunningSheetItem);
        return { ...prev, items: newItems };
      });
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({ title: 'Error', description: 'Failed to duplicate row', variant: 'destructive' });
    }
  }, [sheet, toast]);

  const reorderItems = useCallback(async (items: RunningSheetItem[]) => {
    setSheet(prev => prev ? { ...prev, items } : prev);
    try {
      lastSaveRef.current = Date.now();
      await Promise.all(items.map((item, index) =>
        supabase.from('running_sheet_items').update({ order_index: index }).eq('id', item.id)
      ));
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  }, []);

  const resetToDefault = useCallback(async () => {
    if (!sheet) return;
    try {
      lastSaveRef.current = Date.now();
      await supabase.from('running_sheet_items').delete().eq('sheet_id', sheet.id);
      const rowsToInsert = DEFAULT_ROWS.map(r => ({ ...r, sheet_id: sheet.id }));
      const { data: newItems, error } = await supabase.from('running_sheet_items').insert(rowsToInsert).select();
      if (error) throw error;
      setSheet(prev => prev ? { ...prev, items: newItems as RunningSheetItem[] } : prev);
      setSectionLabel('Running Sheet');
      setSectionNotes(null);
      toast({ title: 'Reset Complete', description: 'Section has been reset to defaults' });
    } catch (error) {
      console.error('Error resetting:', error);
      toast({ title: 'Error', description: 'Failed to reset section', variant: 'destructive' });
    }
  }, [sheet, toast]);

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
      await supabase.from('running_sheet_share_tokens').delete().eq('id', tokenId);
      setShareTokens(prev => prev.filter(t => t.id !== tokenId));
      toast({ title: 'Deleted', description: 'Share link removed' });
    } catch (error) {
      console.error('Error deleting share token:', error);
      toast({ title: 'Error', description: 'Failed to delete share link', variant: 'destructive' });
    }
  }, [toast]);

  const refreshShareTokens = useCallback(async () => {
    if (!sheet) return;
    const { data: tokens } = await supabase
      .from('running_sheet_share_tokens')
      .select('*')
      .eq('sheet_id', sheet.id)
      .order('created_at', { ascending: false });
    setShareTokens((tokens as RunningSheetShareToken[]) || []);
  }, [sheet]);

  return {
    sheet,
    loading,
    saving,
    sectionLabel,
    setSectionLabel,
    sectionNotes,
    setSectionNotes,
    shareTokens,
    updateItem,
    addItem,
    deleteItem,
    duplicateItem,
    reorderItems,
    resetToDefault,
    generateShareToken,
    deleteShareToken,
    refreshShareTokens,
  };
}
