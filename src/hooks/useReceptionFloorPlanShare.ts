/**
 * Phase 2D — Public share-view hook. Calls token-gated RPCs.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ReceptionFloorPlan,
  RoomPolygon,
  RoomShapeKind,
} from '@/hooks/useReceptionFloorPlan';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import type { ReceptionPdfEvent } from '@/lib/receptionFloorPlanPdfExporter';
import { parseHeadSeatingOrder } from '@/lib/headTable';

interface SharePayload {
  plan: ReceptionFloorPlan;
  event: ReceptionPdfEvent;
  tables: ReceptionTable[];
}

interface State {
  data: SharePayload | null;
  backgroundUrl: string | null;
  loading: boolean;
  error: string | null;
}

const parsePolygon = (raw: unknown): RoomPolygon | null => {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as { kind?: string; points?: Array<{ x: number; y: number }> };
  if (
    p.kind &&
    Array.isArray(p.points) &&
    p.points.every((pt) => typeof pt?.x === 'number' && typeof pt?.y === 'number')
  ) {
    return {
      kind: (['rect', 'L', 'T', 'custom'].includes(p.kind) ? p.kind : 'custom') as RoomShapeKind,
      points: p.points,
    };
  }
  return null;
};

export const useReceptionFloorPlanShare = (token: string | undefined): State => {
  const [state, setState] = useState<State>({
    data: null,
    backgroundUrl: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!token) {
      setState({ data: null, backgroundUrl: null, loading: false, error: 'Missing token.' });
      return;
    }
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { data, error } = await supabase.rpc(
        'get_reception_floor_plan_by_share_token',
        { _token: token }
      );
      if (cancelled) return;
      if (error || !data) {
        setState({
          data: null,
          backgroundUrl: null,
          loading: false,
          error: 'This share link is invalid or has been revoked.',
        });
        return;
      }
      const raw = data as {
        plan: Record<string, unknown>;
        event: Record<string, unknown>;
        tables: Array<Record<string, unknown>>;
      };
      const r = raw.plan;
      const plan: ReceptionFloorPlan = {
        id: String(r.id),
        event_id: String(r.event_id),
        room_shape: String(r.room_shape ?? 'rect'),
        room_width_m: Number(r.room_width_m),
        room_length_m: Number(r.room_length_m),
        grid_size_cm: Number(r.grid_size_cm ?? 50),
        table_positions: Array.isArray(r.table_positions)
          ? (r.table_positions as ReceptionFloorPlan['table_positions'])
          : [],
        fixtures: Array.isArray(r.fixtures)
          ? (r.fixtures as ReceptionFloorPlan['fixtures'])
          : [],
        background: {
          path: (r.background_image_url as string | null) ?? null,
          x: Number(r.background_x ?? 0),
          y: Number(r.background_y ?? 0),
          width: r.background_width != null ? Number(r.background_width) : null,
          height: r.background_height != null ? Number(r.background_height) : null,
          rotation: Number(r.background_rotation ?? 0),
          opacity: Number(r.background_opacity ?? 0.6),
          locked: !!r.background_locked,
          visible: (r.background_visible as boolean | null) ?? true,
        },
        room_polygon: parsePolygon(r.room_polygon),
        share_enabled: true,
        share_token: token,
        approval_status: ((r.approval_status as string | null) ?? 'draft') as ReceptionFloorPlan['approval_status'],
        vendor_notes: (r.vendor_notes as string | null) ?? '',
        last_saved_at: String(r.last_saved_at ?? new Date().toISOString()),
      };
      const e = raw.event;
      const event: ReceptionPdfEvent = {
        name: String(e.name ?? 'Event'),
        date: (e.date as string | null) ?? null,
        venue: (e.venue as string | null) ?? null,
        partner1_name: (e.partner1_name as string | null) ?? null,
        partner2_name: (e.partner2_name as string | null) ?? null,
        start_time: (e.start_time as string | null) ?? null,
        finish_time: (e.finish_time as string | null) ?? null,
      };
      const positionByTableId = new Map(plan.table_positions.map((position) => [position.table_id, position]));
      const tables: ReceptionTable[] = (raw.tables ?? []).map((t) => {
        const id = String(t.id);
        const snapshot = positionByTableId.get(id);
        const rawType = (t.table_type as string | null) ?? snapshot?.table_type;
        const tablePurpose = t.table_purpose === 'head' || snapshot?.table_purpose === 'head' ? 'head' : 'standard';
        const headOrder = parseHeadSeatingOrder(t.head_seating_order ?? snapshot?.head_seating_order);
        return {
          id,
          name: (t.name as string | null) ?? snapshot?.table_name ?? '',
          table_no: t.table_no == null ? snapshot?.table_no ?? null : Number(t.table_no),
          limit_seats: Number(t.limit_seats ?? snapshot?.capacity ?? 0),
          table_type: rawType === 'square' || rawType === 'long' ? rawType : 'round',
          notes: (t.notes as string | null) ?? null,
          table_purpose: tablePurpose,
          head_seating_order: headOrder,
          guest_count: tablePurpose === 'head' ? headOrder.length : Number(t.guest_count ?? snapshot?.occupied_count ?? 0),
          occupied_seat_numbers: tablePurpose === 'head' ? headOrder.map((_, index) => Math.floor((Number(t.limit_seats ?? snapshot?.capacity ?? 0) - headOrder.length) / 2) + index + 1) : Array.isArray(t.occupied_seat_numbers)
            ? (t.occupied_seat_numbers as number[])
            : snapshot?.occupied_seat_numbers ?? [],
        };
      });

      for (const fixture of plan.fixtures) {
        if (!fixture.linked_table_id || tables.some((table) => table.id === fixture.linked_table_id)) continue;
        const snapshot = positionByTableId.get(fixture.linked_table_id);
        tables.push({
          id: fixture.linked_table_id,
          name: fixture.linked_table_name ?? snapshot?.table_name ?? 'Bridal Table',
          table_no: fixture.linked_table_no ?? snapshot?.table_no ?? null,
          limit_seats: fixture.linked_table_capacity ?? snapshot?.capacity ?? 0,
          table_type: fixture.linked_table_type ?? snapshot?.table_type ?? 'long',
          notes: null,
          table_purpose: snapshot?.table_purpose ?? 'standard',
          head_seating_order: snapshot?.head_seating_order ?? [],
          guest_count: fixture.linked_table_occupied_count ?? snapshot?.occupied_count ?? 0,
          occupied_seat_numbers: fixture.linked_table_occupied_seat_numbers ?? snapshot?.occupied_seat_numbers ?? [],
        });
      }

      let backgroundUrl: string | null = null;
      if (plan.background.path) {
        const { data: urlData } = await supabase.rpc(
          'get_reception_share_background_signed_url',
          { _token: token }
        );
        if (typeof urlData === 'string' && urlData) backgroundUrl = urlData;
      }

      if (cancelled) return;
      setState({ data: { plan, event, tables }, backgroundUrl, loading: false, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return state;
};
