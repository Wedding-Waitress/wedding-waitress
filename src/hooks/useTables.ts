/**
 * ⚠️ PRODUCTION-READY — LOCKED FOR PRODUCTION ⚠️
 * 
 * This Table Data Management Hook is COMPLETE and APPROVED for production use.
 * 
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break table fetching with guest counts
 * - Changes could break table creation/update/delete
 * - Changes could break capacity validation
 * - Changes could break table numbering
 * 
 * See: MY_EVENTS_TABLES_GUESTLIST_SPECS.md for full specifications
 * 
 * Last locked: 2025-11-12
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registerCache, registerEventCache } from '@/lib/cacheRegistry';
import { parseHeadSeatingOrder, type HeadSeatEntry, type TablePurpose } from '@/lib/headTable';

export type TableType = 'round' | 'square' | 'long';

export interface Table {
  id: string;
  event_id: string;
  user_id: string;
  name: string;
  limit_seats: number;
  notes?: string;
  table_no?: number | null;
  table_type?: TableType | null;
  table_purpose: TablePurpose;
  head_seating_order: HeadSeatEntry[];
  created_at: string;
  updated_at: string;
}

export interface TableWithGuestCount extends Table {
  guest_count: number;
}

// Module-level cache for instant loading on tab switches
const tablesCache = new Map<string, TableWithGuestCount[]>();
const tablesRequests = new Map<string, Promise<TableWithGuestCount[]>>();
registerCache(() => { tablesCache.clear(); tablesRequests.clear(); });
registerEventCache((eventId) => { tablesCache.delete(eventId); tablesRequests.delete(eventId); });

const sortTables = (tables: TableWithGuestCount[]) => tables.sort((a, b) => {
  if (a.table_purpose === 'head' && b.table_purpose !== 'head') return -1;
  if (a.table_purpose !== 'head' && b.table_purpose === 'head') return 1;
  if (a.table_no === null && b.table_no !== null) return -1;
  if (a.table_no !== null && b.table_no === null) return 1;
  if (a.table_no === null && b.table_no === null) return a.name.localeCompare(b.name);
  if (a.table_no !== null && b.table_no !== null) return a.table_no - b.table_no;
  return 0;
});

const requestTables = (eventId: string) => {
  const existing = tablesRequests.get(eventId);
  if (existing) return existing;
  const request = Promise.all([
    supabase.from('tables').select('*').eq('event_id', eventId),
    supabase.from('guests').select('table_id').eq('event_id', eventId),
  ]).then(([{ data: tablesData, error: tablesError }, { data: guestRows, error: guestsError }]) => {
    if (tablesError) throw tablesError;
    if (guestsError) throw guestsError;
    const counts = new Map<string, number>();
    (guestRows ?? []).forEach((guest) => {
      if (guest.table_id) counts.set(guest.table_id, (counts.get(guest.table_id) ?? 0) + 1);
    });
    return sortTables((tablesData ?? []).map((table) => ({
      ...table,
      table_type: (table.table_type as TableType) || 'round',
      table_purpose: table.table_purpose === 'head' ? 'head' : 'standard',
      head_seating_order: parseHeadSeatingOrder(table.head_seating_order),
      guest_count: counts.get(table.id) ?? 0,
    })) as TableWithGuestCount[]);
  }).finally(() => tablesRequests.delete(eventId));
  tablesRequests.set(eventId, request);
  return request;
};

export const useTables = (eventId: string | null) => {
  const cached = eventId ? tablesCache.get(eventId) : undefined;
  const [tables, setTables] = useState<TableWithGuestCount[]>(cached ?? []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Single source of truth for table guest counts
  const getCurrentCount = async (tableId: string): Promise<number> => {
    if (!eventId) return 0;
    
    const { count } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('table_id', tableId);
    
    return count || 0;
  };

  const fetchTables = async () => {
    if (!eventId) {
      setTables([]);
      return;
    }

    if (!tablesCache.has(eventId)) setLoading(true);
    try {
      const sortedTables = await requestTables(eventId);
      tablesCache.set(eventId, sortedTables);
      setTables(sortedTables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTable = async (tableData: {
    name: string;
    limit_seats: number;
    notes?: string;
    table_no?: number | null;
    table_type?: TableType | null;
    table_purpose?: TablePurpose;
    head_seating_order?: HeadSeatEntry[];
  }) => {
    if (!eventId) return false;

    try {
      const { data, error } = await supabase
        .from('tables')
        .insert({
          ...tableData,
          table_type: tableData.table_purpose === 'head' ? 'long' : tableData.table_type,
          event_id: eventId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTables();
      toast({
        title: "Success",
        description: "Table created successfully",
      });
      return true;
    } catch (error: any) {
      console.error('Error creating table:', error);
      
      // Handle unique constraint violation for table numbers
      if (error?.code === '23505' && error?.message?.includes('uq_tables_one_head_per_event')) {
        toast({
          title: 'Head Table already exists',
          description: 'Only one Head Table is allowed for each event.',
          variant: 'destructive',
        });
      } else if (error?.code === '23505' && error?.message?.includes('uq_tables_event_table_no')) {
        toast({
          title: "Error",
          description: "You already added this table number. Choose another table number.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create table",
          variant: "destructive",
        });
      }
      
      // Re-throw error so the modal can handle it
      throw error;
    }
  };

  const updateTable = async (tableId: string, tableData: {
    name: string;
    limit_seats: number;
    notes?: string;
    table_no?: number | null;
    table_type?: TableType | null;
    table_purpose?: TablePurpose;
    head_seating_order?: HeadSeatEntry[];
  }) => {
    try {
      let nextOrder = tableData.head_seating_order ?? [];
      const currentTable = tables.find((table) => table.id === tableId);
      if (tableData.table_purpose === 'head' && currentTable?.table_purpose !== 'head') {
        const { data: assignedGuests, error: guestError } = await supabase
          .from('guests')
          .select('id, seat_no, created_at')
          .eq('event_id', currentTable.event_id)
          .eq('table_id', tableId)
          .order('seat_no', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });
        if (guestError) throw guestError;
        (assignedGuests ?? []).forEach((guest, index) => {
          const entry: HeadSeatEntry = { kind: 'guest', guest_id: guest.id };
          nextOrder = index % 2 === 0 ? [entry, ...nextOrder] : [...nextOrder, entry];
        });
      }

      const { error } = await supabase
        .from('tables')
        .update({
          ...tableData,
          limit_seats: tableData.table_purpose === 'head'
            ? Math.max(tableData.limit_seats, nextOrder.length)
            : tableData.limit_seats,
          table_type: tableData.table_purpose === 'head' ? 'long' : tableData.table_type,
          head_seating_order: tableData.table_purpose === 'standard' ? [] : nextOrder,
        })
        .eq('id', tableId);

      if (error) throw error;

      if (tableData.table_purpose === 'head' && nextOrder.length > 0) {
        const { error: seatingError } = await (supabase.rpc as any)('save_head_table_seating', {
          p_table_id: tableId,
          p_order: nextOrder,
        });
        if (seatingError) throw seatingError;
      }

      await fetchTables();
      toast({
        title: "Success",
        description: "Table updated successfully",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating table:', error);
      
      // Handle unique constraint violation for table numbers
      if (error?.code === '23505' && error?.message?.includes('uq_tables_one_head_per_event')) {
        toast({
          title: 'Head Table already exists',
          description: 'Only one Head Table is allowed for each event.',
          variant: 'destructive',
        });
      } else if (error?.code === '23505' && error?.message?.includes('uq_tables_event_table_no')) {
        toast({
          title: "Error",
          description: "You already added this table number. Choose another table number.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update table",
          variant: "destructive",
        });
      }
      
      // Re-throw error so the modal can handle it
      throw error;
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!eventId) return false;

    try {
      // First check if table has guests (include event_id for consistency)
      const { count } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('table_id', tableId);

      if (count && count > 0) {
        // Refresh tables to sync UI with actual database state
        await fetchTables();
        toast({
          title: "Cannot Delete",
          description: `This table has ${count} guest${count > 1 ? 's' : ''} assigned. Move or remove them before deleting.`,
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;

      await fetchTables();
      toast({
        title: "Success",
        description: "Table deleted successfully",
      });
      return true;
    } catch (error) {
      console.error('Error deleting table:', error);
      toast({
        title: "Error",
        description: "Failed to delete table",
        variant: "destructive",
      });
      return false;
    }
  };

  const getGuestsForTable = async (tableId: string) => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, first_name, last_name, table_id')
        .eq('table_id', tableId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching guests for table:', error);
      return [];
    }
  };

  const saveHeadTableSeating = async (tableId: string, order: HeadSeatEntry[]) => {
    const { error } = await (supabase.rpc as any)('save_head_table_seating', {
      p_table_id: tableId,
      p_order: order,
    });
    if (error) {
      toast({ title: 'Unable to save Head Table seating', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchTables();
    return true;
  };

  useEffect(() => {
    fetchTables();
  }, [eventId]);

  return {
    tables,
    loading,
    fetchTables,
    createTable,
    updateTable,
    deleteTable,
    getGuestsForTable,
    getCurrentCount,
    saveHeadTableSeating,
  };
};
