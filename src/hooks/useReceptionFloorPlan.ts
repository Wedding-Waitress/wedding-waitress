import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { FixtureType } from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/fixtures';

export interface TablePosition {
  table_id: string;
  x: number; // meters from top-left of room
  y: number;
  rotation: number; // degrees
  locked: boolean;
}

export interface Fixture {
  id: string;
  type: FixtureType;
  x: number; // meters (center)
  y: number;
  width_m: number;
  height_m: number;
  rotation: number;
  locked: boolean;
  label?: string;
}

type Row = Database['public']['Tables']['reception_floor_plans']['Row'];

export interface ReceptionFloorPlan {
  id: string;
  event_id: string;
  room_shape: string;
  room_width_m: number;
  room_length_m: number;
  grid_size_cm: number;
  table_positions: TablePosition[];
  fixtures: Fixture[];
  last_saved_at: string;
}

const fromRow = (row: Row): ReceptionFloorPlan => ({
  id: row.id,
  event_id: row.event_id,
  room_shape: row.room_shape,
  room_width_m: Number(row.room_width_m),
  room_length_m: Number(row.room_length_m),
  grid_size_cm: row.grid_size_cm,
  table_positions: Array.isArray(row.table_positions)
    ? (row.table_positions as unknown as TablePosition[])
    : [],
  fixtures: Array.isArray(row.fixtures) ? (row.fixtures as unknown as Fixture[]) : [],
  last_saved_at: row.last_saved_at,
});

export const useReceptionFloorPlan = (eventId: string | null) => {
  const [plan, setPlan] = useState<ReceptionFloorPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Load (and create if missing)
  useEffect(() => {
    if (!eventId) {
      setPlan(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('reception_floor_plans')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('load reception plan', error);
        setLoading(false);
        return;
      }
      if (data) {
        setPlan(fromRow(data as Row));
      } else {
        const { data: created, error: insErr } = await supabase
          .from('reception_floor_plans')
          .insert({ event_id: eventId, user_id: user.id })
          .select('*')
          .single();
        if (!insErr && created) setPlan(fromRow(created as Row));
        else console.error('create reception plan', insErr);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const persist = useCallback(
    async (next: ReceptionFloorPlan) => {
      setSaving(true);
      const { error } = await supabase
        .from('reception_floor_plans')
        .update({
          room_shape: next.room_shape,
          room_width_m: next.room_width_m,
          room_length_m: next.room_length_m,
          grid_size_cm: next.grid_size_cm,
          table_positions: next.table_positions as unknown as Database['public']['Tables']['reception_floor_plans']['Update']['table_positions'],
          last_saved_at: new Date().toISOString(),
        })
        .eq('id', next.id);
      if (error) console.error('save reception plan', error);
      setSaving(false);
    },
    []
  );

  const update = useCallback(
    (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const next = mutator(prev);
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => persist(next), 500);
        return next;
      });
    },
    [persist]
  );

  return { plan, loading, saving, update };
};
