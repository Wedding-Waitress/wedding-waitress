import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseHeadSeatingOrder, type HeadSeatEntry, type TablePurpose } from '@/lib/headTable';

export type ReceptionTableType = 'round' | 'square' | 'long';

export interface ReceptionTable {
  id: string;
  name: string | null;
  table_no: number | null;
  limit_seats: number;
  table_type: ReceptionTableType;
  notes: string | null;
  table_purpose: TablePurpose;
  head_seating_order: HeadSeatEntry[];
  guest_count: number;
  occupied_seat_numbers: number[];
}

/**
 * Phase 1A — Step 2
 * Read-only hook that loads synced tables for an event.
 * The Reception editor uses these as the source of truth — never duplicates them.
 */
export const useReceptionTables = (eventId: string | null) => {
  const [tables, setTables] = useState<ReceptionTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [readyEventId, setReadyEventId] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    if (!eventId) return [] as ReceptionTable[];

    const [{ data: tableRows, error: tablesError }, { data: guestRows, error: guestsError }] =
      await Promise.all([
        supabase
          .from('tables')
          .select('id, name, table_no, limit_seats, table_type, notes, table_purpose, head_seating_order')
          .eq('event_id', eventId)
          .order('table_no', { ascending: true }),
        supabase
          .from('guests')
          .select('table_id, seat_no')
          .eq('event_id', eventId)
          .not('table_id', 'is', null),
      ]);

    if (tablesError) throw tablesError;
    if (guestsError) throw guestsError;

    const occupancy = new Map<string, { count: number; seats: number[] }>();
    for (const guest of guestRows ?? []) {
      if (!guest.table_id) continue;
      const current = occupancy.get(guest.table_id) ?? { count: 0, seats: [] };
      current.count += 1;
      if (typeof guest.seat_no === 'number' && guest.seat_no > 0) {
        current.seats.push(guest.seat_no);
      }
      occupancy.set(guest.table_id, current);
    }

    return (tableRows ?? []).map((table) => {
      const occupied = occupancy.get(table.id) ?? { count: 0, seats: [] };
      const type = table.table_type;
      const tablePurpose: TablePurpose = table.table_purpose === 'head' ? 'head' : 'standard';
      const headOrder = parseHeadSeatingOrder(table.head_seating_order);
      return {
        ...table,
        table_type: type === 'square' || type === 'long' ? type : 'round',
        table_purpose: tablePurpose,
        head_seating_order: headOrder,
        guest_count: Math.min(table.limit_seats, tablePurpose === 'head' ? headOrder.length : occupied.count),
        occupied_seat_numbers: (tablePurpose === 'head'
          ? headOrder.map((_, index) => Math.floor((table.limit_seats - headOrder.length) / 2) + index + 1)
          : [...new Set(occupied.seats)])
          .filter((seat) => seat <= table.limit_seats)
          .sort((a, b) => a - b),
      } satisfies ReceptionTable;
    });
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setTables([]);
      setLoading(false);
      setReadyEventId(null);
      return;
    }
    let cancelled = false;
    const refresh = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const next = await fetchTables();
        if (!cancelled) {
          setTables(next);
          setReadyEventId(eventId);
        }
      } catch (error) {
        console.error('useReceptionTables: failed to load tables', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh(true);

    const channel = supabase
      .channel(`reception-tables:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `event_id=eq.${eventId}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests', filter: `event_id=eq.${eventId}` },
        () => void refresh(),
      )
      .subscribe();
    const pollId = window.setInterval(() => void refresh(), 5000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [eventId, fetchTables]);

  return { tables, loading, ready: !!eventId && readyEventId === eventId };
};
