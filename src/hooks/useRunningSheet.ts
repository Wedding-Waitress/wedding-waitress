import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RunningSheetItem, RunningSheetShareToken } from '@/types/runningSheet';
import debounce from 'lodash-es/debounce';

interface RunningSheetData {
  id: string;
  event_id: string;
  user_id: string;
  items: RunningSheetItem[];
}

const DEFAULT_ROWS: Omit<RunningSheetItem, 'id' | 'sheet_id' | 'created_at' | 'updated_at'>[] = [
  { order_index: 0, time_text: '3.00', description_rich: { text: 'Guests Arrive' }, responsible: '', is_section_header: false },
  { order_index: 1, time_text: '3.30', description_rich: { text: 'Ceremony' }, responsible: 'Celebrant', is_section_header: true },
  { order_index: 2, time_text: '4.00', description_rich: { text: 'Group & Family Photos' }, responsible: 'Photographer', is_section_header: false },
  { order_index: 3, time_text: '4.30', description_rich: { text: 'Pre-Dinner Drinks & Canapes' }, responsible: 'Venue', is_section_header: false },
  { order_index: 4, time_text: '6.00', description_rich: { text: 'Reception doors open & Guests Seated' }, responsible: 'Venue', is_section_header: true },
  { order_index: 5, time_text: '6.30', description_rich: { text: 'Bridal Party Introduction' }, responsible: 'DJ / Band & MC, Photographer & Video', is_section_header: false },
  { order_index: 6, time_text: '7.00', description_rich: { text: 'Entree Served' }, responsible: 'Venue', is_section_header: true },
  { order_index: 7, time_text: '7.30', description_rich: { text: 'Cake Cutting & Toasting for Photos, Bridal Dance, Bridal Party Dance with Wedding Couple, Dance Floor Open for All Guests' }, responsible: 'DJ / Band & MC, Photographer & Video', is_section_header: false },
  { order_index: 8, time_text: '8.00', description_rich: { text: 'Main Meals Served' }, responsible: 'Venue', is_section_header: true },
  { order_index: 9, time_text: '8.30', description_rich: { text: 'Speeches' }, responsible: 'MC, Photographer & Video', is_section_header: false },
  { order_index: 10, time_text: '9.00', description_rich: { text: 'Games then Dance Bracket (The Shoe Game, The Photo Dash, Dance Floor opened)' }, responsible: 'DJ / Band & MC, Photographer & Video', is_section_header: false },
  { order_index: 11, time_text: '10.30', description_rich: { text: 'Flower Toss, Garter Toss, Farewell Circle or Arch!' }, responsible: 'DJ / Band & MC, Photographer & Video', is_section_header: false },
  { order_index: 12, time_text: '11.00', description_rich: { text: 'Conclusion' }, responsible: '', is_section_header: true },
];

export function useRunningSheet(eventId: string | null) {
  const [sheet, setSheet] = useState<RunningSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionLabel, setSectionLabel] = useState('Running Sheet');
  const [sectionNotes, setSectionNotes] = useState<string | null>(null);
  const [shareTokens, setShareTokens] = useState<RunningSheetShareToken[]>([]);
  const { toast } = useToast();

  const fetchSheet = useCallback(async () => {
    if (!eventId) { setSheet(null); return; }
    setLoading(true);
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

  // Debounced item save
  const debouncedItemSave = useRef(
    debounce(async (itemId: string, updates: Partial<RunningSheetItem>) => {
      setSaving(true);
      try {
        const { error } = await supabase.from('running_sheet_items').update(updates).eq('id', itemId);
        if (error) throw error;
      } catch (error) {
        console.error('Error saving item:', error);
      } finally {
        setSaving(false);
      }
    }, 600)
  ).current;

  const updateItem = useCallback((itemId: string, updates: Partial<RunningSheetItem>) => {
    setSheet(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, ...updates } : i) };
    });
    debouncedItemSave(itemId, updates);
  }, [debouncedItemSave]);

  const addItem = useCallback(async () => {
    if (!sheet) return;
    const newOrderIndex = sheet.items.length;
    try {
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
  };
}
