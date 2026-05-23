import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReceptionTable {
  id: string;
  name: string | null;
  table_no: number;
  limit_seats: number;
}

/**
 * Phase 1A — Step 2
 * Read-only hook that loads synced tables for an event.
 * The Reception editor uses these as the source of truth — never duplicates them.
 */
export const useReceptionTables = (eventId: string | null) => {
  const [tables, setTables] = useState<ReceptionTable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setTables([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('tables')
        .select('id, name, table_no, limit_seats')
        .eq('event_id', eventId)
        .order('table_no', { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error('useReceptionTables: failed to load tables', error);
        setTables([]);
      } else {
        setTables((data || []) as ReceptionTable[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { tables, loading };
};
