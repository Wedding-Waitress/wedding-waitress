import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Fixture, ReceptionFloorPlan, RoomPolygon } from './useReceptionFloorPlan';

export interface VenueTemplate {
  id: string;
  submitted_by: string;
  venue_name: string;
  room_name: string;
  city: string | null;
  country: string | null;
  capacity: number;
  room_shape: string;
  room_width_m: number;
  room_length_m: number;
  grid_size_cm: number;
  room_polygon: RoomPolygon | null;
  fixtures: Fixture[];
  background_image_path: string | null;
  background_x: number;
  background_y: number;
  background_width: number | null;
  background_height: number | null;
  background_rotation: number;
  background_opacity: number;
  notes: string | null;
  approved: boolean;
  featured: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_BUCKET = 'venue-template-backgrounds';
const USER_BUCKET = 'reception-floor-plan-backgrounds';

export const venueTemplateBackgroundUrl = (path: string | null): string | null => {
  if (!path) return null;
  const { data } = supabase.storage.from(TEMPLATE_BUCKET).getPublicUrl(path);
  return data.publicUrl || null;
};

const rowToTemplate = (row: Record<string, unknown>): VenueTemplate => ({
  id: row.id as string,
  submitted_by: row.submitted_by as string,
  venue_name: row.venue_name as string,
  room_name: row.room_name as string,
  city: (row.city as string | null) ?? null,
  country: (row.country as string | null) ?? null,
  capacity: Number(row.capacity ?? 0),
  room_shape: (row.room_shape as string) || 'rect',
  room_width_m: Number(row.room_width_m ?? 12),
  room_length_m: Number(row.room_length_m ?? 15),
  grid_size_cm: Number(row.grid_size_cm ?? 50),
  room_polygon: (row.room_polygon as RoomPolygon | null) ?? null,
  fixtures: Array.isArray(row.fixtures) ? (row.fixtures as Fixture[]) : [],
  background_image_path: (row.background_image_path as string | null) ?? null,
  background_x: Number(row.background_x ?? 0),
  background_y: Number(row.background_y ?? 0),
  background_width: row.background_width == null ? null : Number(row.background_width),
  background_height: row.background_height == null ? null : Number(row.background_height),
  background_rotation: Number(row.background_rotation ?? 0),
  background_opacity: Number(row.background_opacity ?? 0.6),
  notes: (row.notes as string | null) ?? null,
  approved: !!row.approved,
  featured: !!row.featured,
  approved_at: (row.approved_at as string | null) ?? null,
  approved_by: (row.approved_by as string | null) ?? null,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

/** Public-facing list of approved templates (for the Choose Venue lookup). */
export const useApprovedVenueTemplates = () => {
  const [templates, setTemplates] = useState<VenueTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('venue_floor_plan_templates')
      .select('*')
      .eq('approved', true)
      .order('featured', { ascending: false })
      .order('venue_name', { ascending: true });
    if (error) console.error('approved templates', error);
    setTemplates(((data ?? []) as Record<string, unknown>[]).map(rowToTemplate));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { templates, loading, refresh };
};

/** Admin list (all rows). */
export const useAllVenueTemplates = () => {
  const [templates, setTemplates] = useState<VenueTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('venue_floor_plan_templates')
      .select('*')
      .order('approved', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) console.error('all templates', error);
    setTemplates(((data ?? []) as Record<string, unknown>[]).map(rowToTemplate));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setApproval = useCallback(
    async (id: string, approved: boolean) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;
      const { error } = await (supabase as any)
        .from('venue_floor_plan_templates')
        .update({
          approved,
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: approved ? userId : null,
        })
        .eq('id', id);
      if (error) return { ok: false as const, error: error.message };
      await refresh();
      return { ok: true as const };
    },
    [refresh]
  );

  const setFeatured = useCallback(
    async (id: string, featured: boolean) => {
      const { error } = await (supabase as any)
        .from('venue_floor_plan_templates')
        .update({ featured })
        .eq('id', id);
      if (error) return { ok: false as const, error: error.message };
      await refresh();
      return { ok: true as const };
    },
    [refresh]
  );

  const updateMeta = useCallback(
    async (id: string, patch: Partial<Pick<VenueTemplate, 'venue_name' | 'room_name' | 'city' | 'country' | 'capacity' | 'notes'>>) => {
      const { error } = await (supabase as any)
        .from('venue_floor_plan_templates')
        .update(patch)
        .eq('id', id);
      if (error) return { ok: false as const, error: error.message };
      await refresh();
      return { ok: true as const };
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      const tpl = templates.find((t) => t.id === id);
      const { error } = await (supabase as any)
        .from('venue_floor_plan_templates')
        .delete()
        .eq('id', id);
      if (error) return { ok: false as const, error: error.message };
      if (tpl?.background_image_path) {
        supabase.storage.from(TEMPLATE_BUCKET).remove([tpl.background_image_path]).catch(() => undefined);
      }
      await refresh();
      return { ok: true as const };
    },
    [refresh, templates]
  );

  return { templates, loading, refresh, setApproval, setFeatured, updateMeta, remove };
};

/** Submit current Reception Floor Plan as a new (unapproved) template. */
export const submitVenueTemplate = async (params: {
  plan: ReceptionFloorPlan;
  backgroundUrl: string | null;
  meta: {
    venue_name: string;
    room_name: string;
    city?: string;
    country?: string;
    capacity?: number;
    notes?: string;
  };
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
  const { plan, backgroundUrl, meta } = params;
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return { ok: false, error: 'Not signed in.' };

  let templateBgPath: string | null = null;

  // Copy background image (if any) from user's private plan into the public template bucket.
  if (plan.background.path && backgroundUrl) {
    try {
      const resp = await fetch(backgroundUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const ext = (plan.background.path.split('.').pop() || 'png').toLowerCase();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(TEMPLATE_BUCKET)
          .upload(path, blob, {
            contentType: blob.type || 'image/png',
            upsert: false,
          });
        if (!upErr) templateBgPath = path;
        else console.warn('template bg upload', upErr);
      }
    } catch (e) {
      console.warn('template bg copy failed', e);
    }
  }

  const insertRow = {
    submitted_by: user.id,
    venue_name: meta.venue_name.trim(),
    room_name: meta.room_name.trim(),
    city: meta.city?.trim() || null,
    country: meta.country?.trim() || null,
    capacity: Math.max(0, Math.floor(meta.capacity ?? 0)),
    room_shape: plan.room_shape,
    room_width_m: plan.room_width_m,
    room_length_m: plan.room_length_m,
    grid_size_cm: plan.grid_size_cm,
    room_polygon: plan.room_polygon as unknown,
    fixtures: plan.fixtures as unknown,
    table_positions: [], // template carries only the room, not user-specific table assignments
    background_image_path: templateBgPath,
    background_x: plan.background.x,
    background_y: plan.background.y,
    background_width: plan.background.width,
    background_height: plan.background.height,
    background_rotation: plan.background.rotation,
    background_opacity: plan.background.opacity,
    notes: meta.notes?.trim() || null,
    approved: false,
  };

  const { data, error } = await (supabase as any)
    .from('venue_floor_plan_templates')
    .insert(insertRow)
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
};

/**
 * Apply an approved template to a user's reception floor plan.
 * Copies the template background into the user's private bucket so the editor flows
 * through existing background logic unchanged.
 */
export const applyVenueTemplateToPlan = async (
  template: VenueTemplate,
  currentPlan: ReceptionFloorPlan
): Promise<ReceptionFloorPlan> => {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  let newBgPath: string | null = null;
  if (template.background_image_path && user) {
    try {
      const url = venueTemplateBackgroundUrl(template.background_image_path);
      if (url) {
        const resp = await fetch(url);
        if (resp.ok) {
          const blob = await resp.blob();
          const ext = (template.background_image_path.split('.').pop() || 'png').toLowerCase();
          const path = `${user.id}/${currentPlan.event_id}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(USER_BUCKET)
            .upload(path, blob, {
              contentType: blob.type || 'image/png',
              upsert: false,
            });
          if (!upErr) newBgPath = path;
        }
      }
    } catch (e) {
      console.warn('apply template bg copy failed', e);
    }
  }

  // Remove previous private bg (best effort) if we replaced it
  if (newBgPath && currentPlan.background.path && currentPlan.background.path !== newBgPath) {
    supabase.storage.from(USER_BUCKET).remove([currentPlan.background.path]).catch(() => undefined);
  }

  // Regenerate fixture ids so they don't collide.
  const fixtures = template.fixtures.map((f) => ({
    ...f,
    id: crypto.randomUUID(),
    locked: false,
  }));

  return {
    ...currentPlan,
    room_shape: template.room_shape,
    room_width_m: template.room_width_m,
    room_length_m: template.room_length_m,
    grid_size_cm: template.grid_size_cm,
    room_polygon: template.room_polygon,
    fixtures,
    table_positions: [], // user re-places their own tables
    background: newBgPath
      ? {
          path: newBgPath,
          x: template.background_x,
          y: template.background_y,
          width: template.background_width ?? template.room_width_m,
          height: template.background_height ?? template.room_length_m,
          rotation: template.background_rotation,
          opacity: template.background_opacity,
          locked: false,
          visible: true,
        }
      : {
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
};
