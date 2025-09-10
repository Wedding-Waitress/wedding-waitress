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
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

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

      setTables(tablesWithCounts);
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
    } catch (error) {
      console.error('Error creating table:', error);
      toast({
        title: "Error",
        description: "Failed to create table",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateTable = async (tableId: string, tableData: {
    name: string;
    limit_seats: number;
    notes?: string;
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
    } catch (error) {
      console.error('Error updating table:', error);
      toast({
        title: "Error",
        description: "Failed to update table",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTable = async (tableId: string) => {
    try {
      // First check if table has guests
      const { count } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', tableId);

      if (count && count > 0) {
        toast({
          title: "Cannot Delete",
          description: "Move or remove guests from this table before deleting.",
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
        .select('first_name, last_name')
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