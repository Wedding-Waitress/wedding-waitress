-- Forward-only, idempotent floor-plan catch-up.
--
-- This migration deliberately describes the current Ceremony and Reception
-- persistence contract in one place. It is safe for an environment that has
-- none, some, or all of the historical floor-plan migrations. It does not
-- rewrite saved layouts or alter any browser/PDF renderer.

-- Reception share payloads include table geometry and semantic Head Table
-- metadata. Establish those prerequisites before compiling the RPC.
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS table_type text DEFAULT 'round',
  ADD COLUMN IF NOT EXISTS table_purpose text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS head_seating_order jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.tables SET table_type = 'round' WHERE table_type IS NULL;
ALTER TABLE public.tables ALTER COLUMN table_type SET DEFAULT 'round';
ALTER TABLE public.tables ALTER COLUMN table_type SET NOT NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_table_type_check'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_table_type_check
      CHECK (table_type IN ('round', 'square', 'long'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_table_purpose_check'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_table_purpose_check
      CHECK (table_purpose IN ('standard', 'head'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_head_geometry_check'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_head_geometry_check
      CHECK (table_purpose <> 'head' OR table_type = 'long');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_head_seating_order_array_check'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_head_seating_order_array_check
      CHECK (jsonb_typeof(head_seating_order) = 'array');
  END IF;
END
$constraints$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_one_head_per_event
  ON public.tables (event_id)
  WHERE table_purpose = 'head';

COMMENT ON COLUMN public.tables.table_type IS
  'Physical table geometry: round, square, or long.';
COMMENT ON COLUMN public.tables.table_purpose IS
  'Stable semantic purpose. Head tables are not inferred from their visible name.';
COMMENT ON COLUMN public.tables.head_seating_order IS
  'Authoritative left-to-right Head Table order as viewed by guests.';

CREATE TABLE IF NOT EXISTS public.ceremony_floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chairs_per_row integer NOT NULL DEFAULT 5,
  total_rows integer NOT NULL DEFAULT 10,
  assigned_rows integer NOT NULL DEFAULT 3,
  left_side_label text NOT NULL DEFAULT 'Groom''s Family',
  right_side_label text NOT NULL DEFAULT 'Bride''s Family',
  altar_label text NOT NULL DEFAULT 'Altar',
  seat_assignments jsonb NOT NULL DEFAULT '[]'::jsonb,
  show_row_numbers boolean NOT NULL DEFAULT true,
  show_seat_numbers boolean NOT NULL DEFAULT true,
  bridal_party_left jsonb DEFAULT '[]'::jsonb,
  bridal_party_right jsonb DEFAULT '[]'::jsonb,
  bridal_party_count_left integer DEFAULT 3,
  bridal_party_count_right integer DEFAULT 3,
  bridal_party_roles_left jsonb DEFAULT '[]'::jsonb,
  bridal_party_roles_right jsonb DEFAULT '[]'::jsonb,
  couple_side_arrangement text DEFAULT 'groom_left',
  person_left_name text DEFAULT 'Groom',
  person_right_name text DEFAULT 'Bride',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ceremony_floor_plans
  ADD COLUMN IF NOT EXISTS bridal_party_left jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bridal_party_right jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bridal_party_count_left integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS bridal_party_count_right integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS bridal_party_roles_left jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bridal_party_roles_right jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS couple_side_arrangement text DEFAULT 'groom_left',
  ADD COLUMN IF NOT EXISTS person_left_name text DEFAULT 'Groom',
  ADD COLUMN IF NOT EXISTS person_right_name text DEFAULT 'Bride';

CREATE INDEX IF NOT EXISTS idx_ceremony_floor_plans_event_id
  ON public.ceremony_floor_plans(event_id);

CREATE TABLE IF NOT EXISTS public.reception_floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  room_shape text NOT NULL DEFAULT 'rectangle',
  room_width_m numeric NOT NULL DEFAULT 15,
  room_length_m numeric NOT NULL DEFAULT 20,
  grid_size_cm integer NOT NULL DEFAULT 50,
  zoom numeric NOT NULL DEFAULT 1,
  pan_x numeric NOT NULL DEFAULT 0,
  pan_y numeric NOT NULL DEFAULT 0,
  background_image_url text,
  background_x numeric NOT NULL DEFAULT 0,
  background_y numeric NOT NULL DEFAULT 0,
  background_width numeric,
  background_height numeric,
  background_rotation numeric NOT NULL DEFAULT 0,
  background_opacity numeric NOT NULL DEFAULT 0.5,
  background_locked boolean NOT NULL DEFAULT false,
  background_visible boolean NOT NULL DEFAULT true,
  table_positions jsonb NOT NULL DEFAULT '[]'::jsonb,
  fixtures jsonb NOT NULL DEFAULT '[]'::jsonb,
  room_polygon jsonb,
  share_token text,
  share_enabled boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'draft',
  vendor_notes text,
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reception_floor_plans
  ADD COLUMN IF NOT EXISTS background_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS room_polygon jsonb,
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS vendor_notes text;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reception_floor_plans'::regclass
      AND conname = 'reception_floor_plans_approval_status_check'
  ) THEN
    ALTER TABLE public.reception_floor_plans
      ADD CONSTRAINT reception_floor_plans_approval_status_check
      CHECK (approval_status IN ('draft', 'sent_to_venue', 'approved', 'final'));
  END IF;
END
$constraints$;

CREATE INDEX IF NOT EXISTS idx_reception_floor_plans_event_id
  ON public.reception_floor_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_reception_floor_plans_user_id
  ON public.reception_floor_plans(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS reception_floor_plans_share_token_key
  ON public.reception_floor_plans(share_token)
  WHERE share_token IS NOT NULL;

-- The event is authoritative for access. This includes the owner, invited team
-- members, event collaborators, and administrators recognised by
-- can_access_event. UPDATE has both USING and WITH CHECK so event_id cannot be
-- changed to an inaccessible event.
ALTER TABLE public.ceremony_floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_floor_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ceremony floor plans" ON public.ceremony_floor_plans;
DROP POLICY IF EXISTS "Users can create their own ceremony floor plans" ON public.ceremony_floor_plans;
DROP POLICY IF EXISTS "Users can update their own ceremony floor plans" ON public.ceremony_floor_plans;
DROP POLICY IF EXISTS "Users can delete their own ceremony floor plans" ON public.ceremony_floor_plans;
DROP POLICY IF EXISTS "Accessible events can view ceremony floor plans" ON public.ceremony_floor_plans;
DROP POLICY IF EXISTS "Accessible events can insert ceremony floor plans" ON public.ceremony_floor_plans;
DROP POLICY IF EXISTS "Accessible events can update ceremony floor plans" ON public.ceremony_floor_plans;
DROP POLICY IF EXISTS "Accessible events can delete ceremony floor plans" ON public.ceremony_floor_plans;

CREATE POLICY "Accessible events can view ceremony floor plans"
  ON public.ceremony_floor_plans FOR SELECT TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Accessible events can insert ceremony floor plans"
  ON public.ceremony_floor_plans FOR INSERT TO authenticated
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Accessible events can update ceremony floor plans"
  ON public.ceremony_floor_plans FOR UPDATE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Accessible events can delete ceremony floor plans"
  ON public.ceremony_floor_plans FOR DELETE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));

DROP POLICY IF EXISTS "Users view own reception floor plans" ON public.reception_floor_plans;
DROP POLICY IF EXISTS "Users insert own reception floor plans" ON public.reception_floor_plans;
DROP POLICY IF EXISTS "Users update own reception floor plans" ON public.reception_floor_plans;
DROP POLICY IF EXISTS "Users delete own reception floor plans" ON public.reception_floor_plans;
DROP POLICY IF EXISTS "Accessible events can view reception floor plans" ON public.reception_floor_plans;
DROP POLICY IF EXISTS "Accessible events can insert reception floor plans" ON public.reception_floor_plans;
DROP POLICY IF EXISTS "Accessible events can update reception floor plans" ON public.reception_floor_plans;
DROP POLICY IF EXISTS "Accessible events can delete reception floor plans" ON public.reception_floor_plans;

CREATE POLICY "Accessible events can view reception floor plans"
  ON public.reception_floor_plans FOR SELECT TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Accessible events can insert reception floor plans"
  ON public.reception_floor_plans FOR INSERT TO authenticated
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Accessible events can update reception floor plans"
  ON public.reception_floor_plans FOR UPDATE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Accessible events can delete reception floor plans"
  ON public.reception_floor_plans FOR DELETE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));

-- Trigger creation is conditional because partially migrated environments may
-- already have these historical triggers.
DO $triggers$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.ceremony_floor_plans'::regclass
      AND tgname = 'update_ceremony_floor_plans_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER update_ceremony_floor_plans_updated_at
      BEFORE UPDATE ON public.ceremony_floor_plans
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.reception_floor_plans'::regclass
      AND tgname = 'update_reception_floor_plans_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER update_reception_floor_plans_updated_at
      BEFORE UPDATE ON public.reception_floor_plans
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$triggers$;

-- The background bucket remains private. Object names are
-- <uploader-user-id>/<event-id>/<random-file>.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reception-floor-plan-backgrounds',
  'reception-floor-plan-backgrounds',
  false,
  26214400,
  ARRAY['image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Reception bg owner select" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner insert" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner update" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner delete" ON storage.objects;
DROP POLICY IF EXISTS "Reception backgrounds event select" ON storage.objects;
DROP POLICY IF EXISTS "Reception backgrounds event insert" ON storage.objects;
DROP POLICY IF EXISTS "Reception backgrounds event update" ON storage.objects;
DROP POLICY IF EXISTS "Reception backgrounds event delete" ON storage.objects;

CREATE POLICY "Reception backgrounds event select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND CASE
    WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_access_event(
        (SELECT auth.uid()),
        ((storage.foldername(name))[2])::uuid
      )
    ELSE false
  END
);

CREATE POLICY "Reception backgrounds event insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND CASE
    WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_access_event(
        (SELECT auth.uid()),
        ((storage.foldername(name))[2])::uuid
      )
    ELSE false
  END
);

CREATE POLICY "Reception backgrounds event update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND CASE
    WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
    ELSE false
  END
)
WITH CHECK (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND CASE
    WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
    ELSE false
  END
);

CREATE POLICY "Reception backgrounds event delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND CASE
    WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
    ELSE false
  END
);

-- Ceremony public rendering is gated by the owner's existing live-view flag.
CREATE OR REPLACE FUNCTION public.get_public_ceremony_floor_plan(event_slug text)
RETURNS TABLE(
  chairs_per_row integer,
  total_rows integer,
  assigned_rows integer,
  left_side_label text,
  right_side_label text,
  altar_label text,
  seat_assignments jsonb,
  show_row_numbers boolean,
  show_seat_numbers boolean,
  bridal_party_left jsonb,
  bridal_party_right jsonb,
  bridal_party_count_left integer,
  bridal_party_count_right integer,
  bridal_party_roles_left jsonb,
  bridal_party_roles_right jsonb,
  couple_side_arrangement text,
  person_left_name text,
  person_right_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    cfp.chairs_per_row, cfp.total_rows, cfp.assigned_rows,
    cfp.left_side_label, cfp.right_side_label, cfp.altar_label,
    cfp.seat_assignments, cfp.show_row_numbers, cfp.show_seat_numbers,
    cfp.bridal_party_left, cfp.bridal_party_right,
    cfp.bridal_party_count_left, cfp.bridal_party_count_right,
    cfp.bridal_party_roles_left, cfp.bridal_party_roles_right,
    cfp.couple_side_arrangement, cfp.person_left_name, cfp.person_right_name
  FROM public.ceremony_floor_plans cfp
  JOIN public.events e ON e.id = cfp.event_id
  WHERE e.slug = event_slug
    AND e.qr_apply_to_live_view = true
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.get_public_ceremony_floor_plan(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_ceremony_floor_plan(text) TO anon, authenticated;

-- Token-gated Reception payload. It returns only the fields required by the
-- read-only share renderer and includes final table/head-table semantics.
CREATE OR REPLACE FUNCTION public.get_reception_floor_plan_by_share_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  plan_row public.reception_floor_plans%ROWTYPE;
  event_row public.events%ROWTYPE;
  tables_json jsonb;
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
    'limit_seats', t.limit_seats,
    'table_type', t.table_type,
    'table_purpose', t.table_purpose,
    'head_seating_order', t.head_seating_order,
    'guest_count', (SELECT count(*) FROM public.guests g WHERE g.table_id = t.id),
    'occupied_seat_numbers', COALESCE((
      SELECT jsonb_agg(g.seat_no ORDER BY g.seat_no)
      FROM public.guests g
      WHERE g.table_id = t.id AND g.seat_no IS NOT NULL
    ), '[]'::jsonb)
  ) ORDER BY (t.table_purpose = 'head') DESC, t.table_no, t.name), '[]'::jsonb)
  INTO tables_json
  FROM public.tables t
  WHERE t.event_id = plan_row.event_id;

  RETURN jsonb_build_object(
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
      'approval_status', plan_row.approval_status,
      'vendor_notes', plan_row.vendor_notes,
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
END
$function$;

REVOKE ALL ON FUNCTION public.get_reception_floor_plan_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reception_floor_plan_by_share_token(text) TO anon, authenticated;

-- Best-effort signed background helper retained for the existing share client.
-- Dynamic SQL keeps the catch-up deployable in projects where the optional
-- storage.url_signing helper is absent; in that case the renderer safely omits
-- the background instead of exposing the private bucket.
CREATE OR REPLACE FUNCTION public.get_reception_share_background_signed_url(_token text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, storage, extensions, pg_temp
AS $function$
DECLARE
  object_path text;
  signed_url text;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT background_image_url INTO object_path
  FROM public.reception_floor_plans
  WHERE share_token = _token
    AND share_enabled = true
  LIMIT 1;

  IF object_path IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    EXECUTE 'SELECT storage.url_signing($1, $2, $3)'
      INTO signed_url
      USING 'reception-floor-plan-backgrounds', object_path, 300;
  EXCEPTION
    WHEN OTHERS THEN
      -- Backgrounds are optional presentation. Never weaken bucket privacy or
      -- fail the token-gated plan payload when URL signing is unavailable.
      signed_url := NULL;
  END;

  RETURN signed_url;
END
$function$;

REVOKE ALL ON FUNCTION public.get_reception_share_background_signed_url(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reception_share_background_signed_url(text) TO anon, authenticated;
