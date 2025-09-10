import { useState, useEffect, useCallback, useMemo } from 'react';
import { TableWithGuestCount } from './useTables';
import { Guest } from './useGuests';

interface UseRealtimeTablesProps {
  tables: TableWithGuestCount[];
  guests: Guest[];
  onRefreshTables: () => void;
}

export const useRealtimeTables = ({ 
  tables, 
  guests, 
  onRefreshTables 
}: UseRealtimeTablesProps) => {
  // Compute tables with updated guest counts based on real-time guest data
  const tablesWithLiveCounts = useMemo(() => {
    return tables.map(table => {
      const currentGuestCount = guests.filter(guest => guest.table_id === table.id).length;
      return {
        ...table,
        guest_count: currentGuestCount
      };
    });
  }, [tables, guests]);

  // Get guests for a specific table from real-time data
  const getGuestsForTable = useCallback((tableId: string) => {
    return guests.filter(guest => guest.table_id === tableId);
  }, [guests]);

  // Check if a table is at capacity
  const isTableFull = useCallback((tableId: string) => {
    const table = tablesWithLiveCounts.find(t => t.id === tableId);
    if (!table) return false;
    return table.guest_count >= table.limit_seats;
  }, [tablesWithLiveCounts]);

  // Get table capacity info
  const getTableCapacity = useCallback((tableId: string) => {
    const table = tablesWithLiveCounts.find(t => t.id === tableId);
    if (!table) return null;
    
    return {
      current: table.guest_count,
      limit: table.limit_seats,
      available: Math.max(0, table.limit_seats - table.guest_count),
      isFull: table.guest_count >= table.limit_seats,
      isOverCapacity: table.guest_count > table.limit_seats,
      progressPercentage: Math.min((table.guest_count / Math.max(table.limit_seats, 1)) * 100, 100)
    };
  }, [tablesWithLiveCounts]);

  return {
    tables: tablesWithLiveCounts,
    getGuestsForTable,
    isTableFull,
    getTableCapacity,
    refreshTables: onRefreshTables
  };
};