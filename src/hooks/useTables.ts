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

export interface Table {
  id: string;
  event_id: string;
  user_id: string;
  name: string;
  limit_seats: number;
  notes?: string;
  table_no?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TableWithGuestCount extends Table {
  guest_count: number;
}

export const useTables = (eventId: string | null) => {
  const [tables, setTables] = useState<TableWithGuestCount[]>([]);
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

    setLoading(true);
    try {
      // Fetch tables with guest counts
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('event_id', eventId);

      if (tablesError) throw tablesError;

      // Fetch guest counts for each table using single source of truth
      const tablesWithCounts = await Promise.all(
        (tablesData || []).map(async (table) => {
          const guestCount = await getCurrentCount(table.id);
          return {
            ...table,
            guest_count: guestCount
          };
        })
      );

      // Custom sorting: named tables first (alphabetically), then numbered tables (sequentially)
      const sortedTables = tablesWithCounts.sort((a, b) => {
        // Named tables (table_no is null) come first
        if (a.table_no === null && b.table_no !== null) return -1;
        if (a.table_no !== null && b.table_no === null) return 1;
        
        // Both are named tables - sort alphabetically by name
        if (a.table_no === null && b.table_no === null) {
          return a.name.localeCompare(b.name);
        }
        
        // Both are numbered tables - sort by table number
        if (a.table_no !== null && b.table_no !== null) {
          return a.table_no - b.table_no;
        }
        
        return 0;
      });

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
  }) => {
    if (!eventId) return false;

    try {
      const { data, error } = await supabase
        .from('tables')
        .insert({
          ...tableData,
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
      if (error?.code === '23505' && error?.message?.includes('uq_tables_event_table_no')) {
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
  }) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update(tableData)
        .eq('id', tableId);

      if (error) throw error;

      await fetchTables();
      toast({
        title: "Success",
        description: "Table updated successfully",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating table:', error);
      
      // Handle unique constraint violation for table numbers
      if (error?.code === '23505' && error?.message?.includes('uq_tables_event_table_no')) {
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
    getCurrentCount
  };
};