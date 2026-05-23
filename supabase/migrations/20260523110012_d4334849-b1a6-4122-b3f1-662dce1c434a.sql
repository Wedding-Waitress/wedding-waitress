-- Phase 2: extend reception_floor_plans with polygon + share token
ALTER TABLE public.reception_floor_plans
  ADD COLUMN IF NOT EXISTS room_polygon jsonb,
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS reception_floor_plans_share_token_key
  ON public.reception_floor_plans (share_token)
  WHERE share_token IS NOT NULL;

-- Public lookup (SECURITY DEFINER, bypasses RLS but token-gated)
CREATE OR REPLACE FUNCTION public.get_reception_floor_plan_by_share_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_row public.reception_floor_plans%ROWTYPE;
  event_row public.events%ROWTYPE;
  tables_json jsonb;
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO plan_row
  FROM public.reception_floor_plans
  WHERE share_token = _token
    AND share_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO event_row
  FROM public.events
  WHERE id = plan_row.event_id
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'table_no', t.table_no,
    'limit_seats', t.limit_seats
  ) ORDER BY t.table_no), '[]'::jsonb)
  INTO tables_json
  FROM public.tables t
  WHERE t.event_id = plan_row.event_id;

  result := jsonb_build_object(
    'plan', jsonb_build_object(
      'id', plan_row.id,
      'event_id', plan_row.event_id,
      'room_shape', plan_row.room_shape,
      'room_width_m', plan_row.room_width_m,
      'room_length_m', plan_row.room_length_m,
      'grid_size_cm', plan_row.grid_size_cm,
      'table_positions', plan_row.table_positions,
      'fixtures', plan_row.fixtures,
      'room_polygon', plan_row.room_polygon,
      'background_image_url', plan_row.background_image_url,
      'background_x', plan_row.background_x,
      'background_y', plan_row.background_y,
      'background_width', plan_row.background_width,
      'background_height', plan_row.background_height,
      'background_rotation', plan_row.background_rotation,
      'background_opacity', plan_row.background_opacity,
      'background_locked', plan_row.background_locked,
      'background_visible', plan_row.background_visible,
      'last_saved_at', plan_row.last_saved_at
    ),
    'event', jsonb_build_object(
      'name', event_row.name,
      'date', event_row.date,
      'venue', event_row.venue,
      'partner1_name', event_row.partner1_name,
      'partner2_name', event_row.partner2_name,
      'start_time', event_row.start_time,
      'finish_time', event_row.finish_time
    ),
    'tables', tables_json
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reception_floor_plan_by_share_token(text) TO anon, authenticated;

-- Companion: get a short-lived signed URL for the background image when accessed via share token.
-- This avoids exposing the bucket. Returns text URL or NULL.
CREATE OR REPLACE FUNCTION public.get_reception_share_background_signed_url(_token text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  plan_row public.reception_floor_plans%ROWTYPE;
  signed_url text;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO plan_row
  FROM public.reception_floor_plans
  WHERE share_token = _token AND share_enabled = true
  LIMIT 1;

  IF NOT FOUND OR plan_row.background_image_url IS NULL THEN
    RETURN NULL;
  END IF;

  -- Best-effort: try to mint a signed URL via storage. If the helper isn't
  -- available in this project, return NULL and the client falls back gracefully.
  BEGIN
    SELECT storage.url_signing(
      'reception-floor-plan-backgrounds',
      plan_row.background_image_url,
      300
    ) INTO signed_url;
  EXCEPTION WHEN OTHERS THEN
    signed_url := NULL;
  END;

  RETURN signed_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reception_share_background_signed_url(text) TO anon, authenticated;