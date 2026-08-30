import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  FIXTURE_BY_TYPE,
  type FixtureType,
} from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/fixtures';
import type { ReceptionTableType } from '@/hooks/useReceptionTables';
import type { HeadSeatEntry, TablePurpose } from '@/lib/headTable';
import { pdfFirstPageToPng } from '@/lib/pdfFirstPageToPng';

export interface TablePosition {
  table_id: string;
  x: number; // meters from top-left of room
  y: number;
  rotation: number; // degrees
  locked: boolean;
  /** Optional short note attached to this placed table (e.g. "Elderly guests"). */
  note?: string;
  /** Authoritative-table snapshot used by token-gated read-only rendering. */
  table_name?: string | null;
  table_no?: number | null;
  table_type?: ReceptionTableType;
  capacity?: number;
  occupied_count?: number;
  occupied_seat_numbers?: number[];
  table_purpose?: TablePurpose;
  head_seating_order?: HeadSeatEntry[];
  width_m?: number;
  height_m?: number;
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
  /** Stable link to the authoritative Bridal Table record, when applicable. */
  linked_table_id?: string;
  linked_table_name?: string | null;
  linked_table_no?: number | null;
  linked_table_type?: ReceptionTableType;
  linked_table_capacity?: number;
  linked_table_occupied_count?: number;
  linked_table_occupied_seat_numbers?: number[];
}

type Row = Database['public']['Tables']['reception_floor_plans']['Row'];

export interface ReceptionBackground {
  /** Storage path inside the `reception-floor-plan-backgrounds` bucket, or null when no image. */
  path: string | null;
  /** Top-left x in meters relative to the room. */
  x: number;
  /** Top-left y in meters relative to the room. */
  y: number;
  /** Width in meters (null = no image). */
  width: number | null;
  /** Height in meters (null = no image). */
  height: number | null;
  /** Rotation in degrees. */
  rotation: number;
  /** Opacity 0.1 – 1.0. */
  opacity: number;
  locked: boolean;
  visible: boolean;
}

export type RoomShapeKind = 'rect' | 'L' | 'T' | 'custom';
export interface RoomPolygon {
  kind: RoomShapeKind;
  /** Polygon vertices in meters, top-left origin of the room bounding box. */
  points: Array<{ x: number; y: number }>;
}

export type ApprovalStatus = 'draft' | 'sent_to_venue' | 'approved' | 'final';

export interface ReceptionFloorPlan {
  id: string;
  event_id: string;
  room_shape: string;
  room_width_m: number;
  room_length_m: number;
  grid_size_cm: number;
  table_positions: TablePosition[];
  fixtures: Fixture[];
  background: ReceptionBackground;
  /** Optional non-rectangular room polygon. Null = use rect from width/length. */
  room_polygon: RoomPolygon | null;
  share_enabled: boolean;
  share_token: string | null;
  /** Approval workflow status for the venue. */
  approval_status: ApprovalStatus;
  /** Free-text vendor / setup notes. */
  vendor_notes: string;
  last_saved_at: string;
}


const fromRow = (row: Row): ReceptionFloorPlan => {
  const rawPoly = (row as unknown as { room_polygon?: unknown }).room_polygon;
  let polygon: RoomPolygon | null = null;
  if (rawPoly && typeof rawPoly === 'object') {
    const p = rawPoly as { kind?: string; points?: Array<{ x: number; y: number }> };
    if (
      p.kind &&
      Array.isArray(p.points) &&
      p.points.every((pt) => typeof pt?.x === 'number' && typeof pt?.y === 'number')
    ) {
      polygon = {
        kind: (['rect', 'L', 'T', 'custom'].includes(p.kind) ? p.kind : 'custom') as RoomShapeKind,
        points: p.points,
      };
    }
  }
  return {
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
    background: {
      path: row.background_image_url ?? null,
      x: Number(row.background_x ?? 0),
      y: Number(row.background_y ?? 0),
      width: row.background_width != null ? Number(row.background_width) : null,
      height: row.background_height != null ? Number(row.background_height) : null,
      rotation: Number(row.background_rotation ?? 0),
      opacity: Number(row.background_opacity ?? 0.6),
      locked: !!row.background_locked,
      visible: row.background_visible ?? true,
    },
    room_polygon: polygon,
    share_enabled: !!(row as unknown as { share_enabled?: boolean }).share_enabled,
    share_token: (row as unknown as { share_token?: string | null }).share_token ?? null,
    approval_status: (((row as unknown as { approval_status?: string }).approval_status as ApprovalStatus) ?? 'draft') as ApprovalStatus,
    vendor_notes: (row as unknown as { vendor_notes?: string | null }).vendor_notes ?? '',
    last_saved_at: row.last_saved_at,
  };
};

const BUCKET = 'reception-floor-plan-backgrounds';
const ACCEPTED = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const initialReceptionFixtures = (roomWidth: number, roomLength: number): Fixture[] => {
  const create = (
    type: FixtureType,
    x: number,
    y: number,
  ): Fixture => {
    const spec = FIXTURE_BY_TYPE[type];
    return {
      id: crypto.randomUUID(),
      type,
      x,
      y,
      width_m: spec.width_m,
      height_m: spec.height_m,
      rotation: 0,
      locked: false,
    };
  };

  return [
    create('dance_floor', roomWidth / 2, roomLength / 2),
    create('stage', roomWidth / 2, Math.max(2.5, FIXTURE_BY_TYPE.stage.height_m / 2 + 0.5)),
    create('cake_table', Math.max(1, roomWidth * 0.15), Math.max(1, roomLength * 0.25)),
  ];
};

export const useReceptionFloorPlan = (eventId: string | null) => {
  const [plan, setPlan] = useState<ReceptionFloorPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
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
        const roomWidth = 15;
        const roomLength = 20;
        const { data: created, error: insErr } = await supabase
          .from('reception_floor_plans')
          .insert({
            event_id: eventId,
            user_id: user.id,
            fixtures: initialReceptionFixtures(roomWidth, roomLength) as unknown as Database['public']['Tables']['reception_floor_plans']['Insert']['fixtures'],
          })
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

  // Re-sign background URL whenever the path changes; refresh every 50 min.
  useEffect(() => {
    const path = plan?.background.path ?? null;
    if (!path) {
      setBackgroundUrl(null);
      return;
    }
    let cancelled = false;
    const sign = async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (cancelled) return;
      if (error || !data) {
        console.error('sign bg url', error);
        setBackgroundUrl(null);
      } else {
        setBackgroundUrl(data.signedUrl);
      }
    };
    sign();
    const id = window.setInterval(sign, 50 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [plan?.background.path]);

  const persist = useCallback(async (next: ReceptionFloorPlan) => {
    setSaving(true);
    const { error } = await supabase
      .from('reception_floor_plans')
      .update({
        room_shape: next.room_shape,
        room_width_m: next.room_width_m,
        room_length_m: next.room_length_m,
        grid_size_cm: next.grid_size_cm,
        table_positions: next.table_positions as unknown as Database['public']['Tables']['reception_floor_plans']['Update']['table_positions'],
        fixtures: next.fixtures as unknown as Database['public']['Tables']['reception_floor_plans']['Update']['fixtures'],
        background_image_url: next.background.path,
        background_x: next.background.x,
        background_y: next.background.y,
        background_width: next.background.width,
        background_height: next.background.height,
        background_rotation: next.background.rotation,
        background_opacity: next.background.opacity,
        background_locked: next.background.locked,
        background_visible: next.background.visible,
        // Phase 2/5: room polygon, share token, approval + vendor notes (typed loosely; columns added via migration)
        ...({
          room_polygon: next.room_polygon as unknown,
          share_enabled: next.share_enabled,
          share_token: next.share_token,
          approval_status: next.approval_status,
          vendor_notes: next.vendor_notes ?? '',
        } as Record<string, unknown>),
        last_saved_at: new Date().toISOString(),
      })
      .eq('id', next.id);
    if (error) console.error('save reception plan', error);
    setSaving(false);
  }, []);

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

  /** Flush any pending debounced save immediately. */
  const flush = useCallback(async () => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (plan) await persist(plan);
  }, [persist, plan]);

  const uploadBackground = useCallback(
    async (file: File): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!plan) return { ok: false, error: 'Floor plan not loaded yet.' };
      if (!ACCEPTED.includes(file.type)) {
        return { ok: false, error: 'Only PNG, JPG, or PDF files are supported.' };
      }
      if (file.size > MAX_BYTES) {
        return { ok: false, error: 'File is larger than 25 MB.' };
      }
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return { ok: false, error: 'Not signed in.' };

      setUploadingBackground(true);
      try {
        let uploadBlob: Blob = file;
        let ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        let contentType = file.type;
        if (file.type === 'application/pdf') {
          uploadBlob = await pdfFirstPageToPng(file, 2);
          ext = 'png';
          contentType = 'image/png';
        } else if (file.type === 'image/jpeg') {
          ext = 'jpg';
        } else if (file.type === 'image/png') {
          ext = 'png';
        }

        const path = `${user.id}/${plan.event_id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, uploadBlob, { contentType, upsert: false });
        if (upErr) {
          console.error('upload bg', upErr);
          return { ok: false, error: upErr.message };
        }

        // Remove the previous file (best effort)
        const prevPath = plan.background.path;
        if (prevPath && prevPath !== path) {
          supabase.storage.from(BUCKET).remove([prevPath]).catch(() => undefined);
        }

        // Default geometry: cover the room
        const next: ReceptionFloorPlan = {
          ...plan,
          background: {
            path,
            x: 0,
            y: 0,
            width: plan.room_width_m,
            height: plan.room_length_m,
            rotation: 0,
            opacity: 0.6,
            locked: false,
            visible: true,
          },
        };
        setPlan(next);
        await persist(next);
        return { ok: true };
      } catch (e) {
        console.error('uploadBackground', e);
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Upload failed.',
        };
      } finally {
        setUploadingBackground(false);
      }
    },
    [persist, plan]
  );

  const removeBackground = useCallback(async () => {
    if (!plan) return;
    const prevPath = plan.background.path;
    const next: ReceptionFloorPlan = {
      ...plan,
      background: {
        path: null,
        x: 0,
        y: 0,
        width: null,
        height: null,
        rotation: 0,
        opacity: 0.6,
        locked: false,
        visible: true,
      },
    };
    setPlan(next);
    await persist(next);
    if (prevPath) {
      supabase.storage.from(BUCKET).remove([prevPath]).catch(() => undefined);
    }
  }, [persist, plan]);

  const generateShareToken = useCallback(async (): Promise<string | null> => {
    if (!plan) return null;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const next: ReceptionFloorPlan = {
      ...plan,
      share_enabled: true,
      share_token: token,
    };
    setPlan(next);
    await persist(next);
    return token;
  }, [persist, plan]);

  const revokeShareToken = useCallback(async () => {
    if (!plan) return;
    const next: ReceptionFloorPlan = {
      ...plan,
      share_enabled: false,
      share_token: null,
    };
    setPlan(next);
    await persist(next);
  }, [persist, plan]);

  return {
    plan,
    loading,
    saving,
    update,
    flush,
    backgroundUrl,
    uploadBackground,
    removeBackground,
    uploadingBackground,
    generateShareToken,
    revokeShareToken,
  };
};
