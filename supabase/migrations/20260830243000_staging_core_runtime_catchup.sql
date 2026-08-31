-- Narrow staging catch-up for core runtime objects that exist in the current
-- staging database but are incomplete or missing from migration provenance.
--
-- This migration is deliberately independent of billing, subscriptions,
-- dynamic QR codes, and account membership. It is safe to run more than once.

-- ---------------------------------------------------------------------------
-- Live-view visibility settings
-- ---------------------------------------------------------------------------
-- The table exists in staging, but no source migration creates it. The guarded
-- create records the canonical shape without replacing or deleting existing
-- rows. The following additive ALTERs also repair partially provisioned copies.
CREATE TABLE IF NOT EXISTS public.live_view_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  show_rsvp_invite boolean NOT NULL DEFAULT false,
  show_update_details boolean NOT NULL DEFAULT false,
  show_search boolean NOT NULL DEFAULT true,
  show_ceremony boolean NOT NULL DEFAULT false,
  show_reception boolean NOT NULL DEFAULT false,
  show_invite_video boolean NOT NULL DEFAULT false,
  show_welcome_video boolean NOT NULL DEFAULT false,
  show_floor_plan boolean NOT NULL DEFAULT false,
  show_menu boolean NOT NULL DEFAULT false,
  show_reception_floor_plan boolean NOT NULL DEFAULT false,
  kiosk_show_rsvp_status boolean NOT NULL DEFAULT true,
  kiosk_show_dietary boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_view_settings
  ADD COLUMN IF NOT EXISTS show_rsvp_invite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_update_details boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_search boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_ceremony boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_reception boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_invite_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_welcome_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_floor_plan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_menu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_reception_floor_plan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kiosk_show_rsvp_status boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS kiosk_show_dietary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS live_view_settings_event_id_key
  ON public.live_view_settings (event_id);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.live_view_settings'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (event_id) REFERENCES events(id)%'
  ) THEN
    ALTER TABLE public.live_view_settings
      ADD CONSTRAINT live_view_settings_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
END
$migration$;

ALTER TABLE public.live_view_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_view_settings FORCE ROW LEVEL SECURITY;

-- Anonymous guests must use the deliberately limited public RPCs; they never
-- receive direct table access.
REVOKE ALL ON TABLE public.live_view_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_view_settings TO authenticated;

DROP POLICY IF EXISTS "Public can read settings for live view events" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event owners can view live view settings" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event owners can create live view settings" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event owners can update live view settings" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event owners can delete live view settings" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event managers can read live view settings" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event managers can create live view settings" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event managers can update live view settings" ON public.live_view_settings;
DROP POLICY IF EXISTS "Event managers can delete live view settings" ON public.live_view_settings;

CREATE POLICY "Event managers can read live view settings"
  ON public.live_view_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events event_row
      WHERE event_row.id = live_view_settings.event_id
        AND (
          event_row.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.event_collaborators collaborator
            WHERE collaborator.event_id = event_row.id
              AND collaborator.user_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY "Event managers can create live view settings"
  ON public.live_view_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events event_row
      WHERE event_row.id = live_view_settings.event_id
        AND (
          event_row.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.event_collaborators collaborator
            WHERE collaborator.event_id = event_row.id
              AND collaborator.user_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY "Event managers can update live view settings"
  ON public.live_view_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events event_row
      WHERE event_row.id = live_view_settings.event_id
        AND (
          event_row.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.event_collaborators collaborator
            WHERE collaborator.event_id = event_row.id
              AND collaborator.user_id = (SELECT auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events event_row
      WHERE event_row.id = live_view_settings.event_id
        AND (
          event_row.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.event_collaborators collaborator
            WHERE collaborator.event_id = event_row.id
              AND collaborator.user_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY "Event managers can delete live view settings"
  ON public.live_view_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events event_row
      WHERE event_row.id = live_view_settings.event_id
        AND (
          event_row.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.event_collaborators collaborator
            WHERE collaborator.event_id = event_row.id
              AND collaborator.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- Preserve the existing updated_at behavior where the shared timestamp helper
-- is available, without assuming how staging originally provisioned the table.
DO $migration$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgrelid = 'public.live_view_settings'::regclass
         AND tgname = 'update_live_view_settings_updated_at'
         AND NOT tgisinternal
     ) THEN
    CREATE TRIGGER update_live_view_settings_updated_at
      BEFORE UPDATE ON public.live_view_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$migration$;

-- Anonymous clients receive only the safe visibility flags for an explicitly
-- published event. They never query live_view_settings directly.
CREATE OR REPLACE FUNCTION public.get_public_live_view_settings(_event_slug text)
RETURNS TABLE(
  show_rsvp_invite boolean,
  show_search boolean,
  show_ceremony boolean,
  show_reception boolean,
  show_update_details boolean,
  show_invite_video boolean,
  show_welcome_video boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    settings_row.show_rsvp_invite,
    settings_row.show_search,
    settings_row.show_ceremony,
    settings_row.show_reception,
    settings_row.show_update_details,
    settings_row.show_invite_video,
    settings_row.show_welcome_video
  FROM public.live_view_settings settings_row
  JOIN public.events event_row ON event_row.id = settings_row.event_id
  WHERE event_row.slug = _event_slug
    AND event_row.qr_apply_to_live_view = true
    AND _event_slug IS NOT NULL
    AND length(_event_slug) BETWEEN 1 AND 200;
$function$;

REVOKE ALL ON FUNCTION public.get_public_live_view_settings(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_live_view_settings(text)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Run-sheet public editor metadata
-- ---------------------------------------------------------------------------
-- Staging has the organiser-owned sheet/item tables but is missing the later
-- metadata/formatting columns, share-token table, and every share RPC.
ALTER TABLE public.running_sheets
  ADD COLUMN IF NOT EXISTS section_label text DEFAULT 'Run Sheet',
  ADD COLUMN IF NOT EXISTS section_notes text;

ALTER TABLE public.running_sheet_items
  ADD COLUMN IF NOT EXISTS is_bold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_italic boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_underline boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.running_sheet_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES public.running_sheets(id) ON DELETE CASCADE,
  token text NOT NULL,
  permission text NOT NULL DEFAULT 'view_only',
  recipient_name text,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.running_sheet_share_tokens
  ADD COLUMN IF NOT EXISTS permission text NOT NULL DEFAULT 'view_only',
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS running_sheet_share_tokens_token_key
  ON public.running_sheet_share_tokens (token);
CREATE INDEX IF NOT EXISTS running_sheet_share_tokens_sheet_id_idx
  ON public.running_sheet_share_tokens (sheet_id);
CREATE INDEX IF NOT EXISTS running_sheet_share_tokens_expires_at_idx
  ON public.running_sheet_share_tokens (expires_at)
  WHERE expires_at IS NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.running_sheet_share_tokens'::regclass
      AND conname = 'running_sheet_share_tokens_permission_check'
  ) THEN
    ALTER TABLE public.running_sheet_share_tokens
      ADD CONSTRAINT running_sheet_share_tokens_permission_check
      CHECK (permission IN ('view_only', 'can_edit'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.running_sheet_share_tokens'::regclass
      AND conname = 'running_sheet_share_tokens_token_format_check'
  ) THEN
    ALTER TABLE public.running_sheet_share_tokens
      ADD CONSTRAINT running_sheet_share_tokens_token_format_check
      CHECK (
        token ~ '^[A-Za-z0-9_-]{32,128}={0,2}$'
        AND length(regexp_replace(token, '=+$', '')) BETWEEN 32 AND 128
      );
  END IF;
END
$migration$;

ALTER TABLE public.running_sheet_share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.running_sheet_share_tokens FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.running_sheet_share_tokens FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.running_sheet_share_tokens TO authenticated;

DROP POLICY IF EXISTS "Users can create share tokens for their sheets" ON public.running_sheet_share_tokens;
DROP POLICY IF EXISTS "Users can view their own share tokens" ON public.running_sheet_share_tokens;
DROP POLICY IF EXISTS "Users can update their own share tokens" ON public.running_sheet_share_tokens;
DROP POLICY IF EXISTS "Users can delete their own share tokens" ON public.running_sheet_share_tokens;

CREATE POLICY "Users can create share tokens for their sheets"
  ON public.running_sheet_share_tokens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.running_sheets sheet_row
      WHERE sheet_row.id = running_sheet_share_tokens.sheet_id
        AND sheet_row.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can view their own share tokens"
  ON public.running_sheet_share_tokens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.running_sheets sheet_row
      WHERE sheet_row.id = running_sheet_share_tokens.sheet_id
        AND sheet_row.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own share tokens"
  ON public.running_sheet_share_tokens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.running_sheets sheet_row
      WHERE sheet_row.id = running_sheet_share_tokens.sheet_id
        AND sheet_row.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.running_sheets sheet_row
      WHERE sheet_row.id = running_sheet_share_tokens.sheet_id
        AND sheet_row.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete their own share tokens"
  ON public.running_sheet_share_tokens FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.running_sheets sheet_row
      WHERE sheet_row.id = running_sheet_share_tokens.sheet_id
        AND sheet_row.user_id = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.generate_running_sheet_share_token(
  _sheet_id uuid,
  _permission text DEFAULT 'view_only',
  _recipient_name text DEFAULT NULL,
  _validity_days integer DEFAULT 90
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  generated_token text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF _permission IS NULL
     OR _permission NOT IN ('view_only', 'can_edit')
     OR _validity_days IS NULL
     OR _validity_days NOT BETWEEN 1 AND 365
     OR length(_recipient_name) > 200 THEN
    RAISE EXCEPTION 'Invalid share-token options' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.running_sheets sheet_row
    WHERE sheet_row.id = _sheet_id
      AND sheet_row.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Running sheet not found or not owned by caller' USING ERRCODE = '42501';
  END IF;

  generated_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.running_sheet_share_tokens (
    sheet_id, token, permission, recipient_name, expires_at
  ) VALUES (
    _sheet_id,
    generated_token,
    _permission,
    NULLIF(btrim(_recipient_name), ''),
    statement_timestamp() + make_interval(days => _validity_days)
  );

  RETURN generated_token;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_running_sheet_by_token(text);
CREATE FUNCTION public.get_running_sheet_by_token(share_token text)
RETURNS TABLE(
  sheet_id uuid,
  event_id uuid,
  event_name text,
  event_date date,
  event_venue text,
  start_time time without time zone,
  finish_time time without time zone,
  ceremony_date date,
  ceremony_venue text,
  ceremony_start_time time without time zone,
  ceremony_finish_time time without time zone,
  permission text,
  section_label text,
  section_notes text,
  items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  normalized_token text;
  token_id uuid;
  target_sheet_id uuid;
  target_event_id uuid;
  token_permission text;
BEGIN
  normalized_token := regexp_replace(btrim(share_token), '=+$', '');
  IF normalized_token IS NULL
     OR length(normalized_token) < 32
     OR length(normalized_token) > 128
     OR normalized_token !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN;
  END IF;

  SELECT token_row.id, token_row.sheet_id, sheet_row.event_id, token_row.permission
    INTO token_id, target_sheet_id, target_event_id, token_permission
    FROM public.running_sheet_share_tokens token_row
    JOIN public.running_sheets sheet_row ON sheet_row.id = token_row.sheet_id
   WHERE rtrim(token_row.token, '=') = normalized_token
     AND token_row.permission IN ('view_only', 'can_edit')
     AND (token_row.expires_at IS NULL OR token_row.expires_at > statement_timestamp())
   ORDER BY token_row.created_at DESC
   LIMIT 1;

  IF target_sheet_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.running_sheet_share_tokens token_row
     SET last_accessed_at = statement_timestamp()
   WHERE token_row.id = token_id;

  RETURN QUERY
  SELECT
    sheet_row.id,
    event_row.id,
    event_row.name,
    event_row.date,
    event_row.venue,
    event_row.start_time,
    event_row.finish_time,
    event_row.ceremony_date,
    event_row.ceremony_venue,
    event_row.ceremony_start_time,
    event_row.ceremony_finish_time,
    token_permission,
    COALESCE(NULLIF(sheet_row.section_label, ''), 'Run Sheet'),
    sheet_row.section_notes,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', item_row.id,
          'time_text', item_row.time_text,
          'description_rich', item_row.description_rich,
          'responsible', item_row.responsible,
          'order_index', item_row.order_index,
          'is_section_header', COALESCE(item_row.is_section_header, false),
          'is_bold', COALESCE(item_row.is_bold, false),
          'is_italic', COALESCE(item_row.is_italic, false),
          'is_underline', COALESCE(item_row.is_underline, false)
        ) ORDER BY item_row.order_index, item_row.id
      )
      FROM public.running_sheet_items item_row
      WHERE item_row.sheet_id = target_sheet_id
    ), '[]'::jsonb)
  FROM public.running_sheets sheet_row
  JOIN public.events event_row ON event_row.id = sheet_row.event_id
  WHERE sheet_row.id = target_sheet_id
    AND event_row.id = target_event_id;
END;
$function$;

-- Public share-link mutations intentionally use SECURITY DEFINER. Every
-- function normalizes and validates the high-entropy token, requires an
-- unexpired can_edit grant, and scopes writes to that token's sheet.
CREATE OR REPLACE FUNCTION public.update_running_sheet_item_by_token(
  share_token text,
  item_id uuid,
  new_time_text text DEFAULT NULL,
  new_description_rich jsonb DEFAULT NULL,
  new_responsible text DEFAULT NULL,
  new_is_section_header boolean DEFAULT NULL,
  new_is_bold boolean DEFAULT NULL,
  new_is_italic boolean DEFAULT NULL,
  new_is_underline boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  normalized_token text;
  token_id uuid;
  target_sheet_id uuid;
BEGIN
  normalized_token := regexp_replace(btrim(share_token), '=+$', '');
  IF normalized_token IS NULL
     OR length(normalized_token) < 32
     OR length(normalized_token) > 128
     OR normalized_token !~ '^[A-Za-z0-9_-]+$'
     OR length(new_time_text) > 100
     OR length(new_responsible) > 2000
     OR pg_column_size(new_description_rich) > 100000 THEN
    RETURN false;
  END IF;

  SELECT token_row.id, token_row.sheet_id
    INTO token_id, target_sheet_id
    FROM public.running_sheet_share_tokens token_row
   WHERE rtrim(token_row.token, '=') = normalized_token
     AND token_row.permission = 'can_edit'
     AND (token_row.expires_at IS NULL OR token_row.expires_at > statement_timestamp())
   ORDER BY token_row.created_at DESC
   LIMIT 1
   FOR UPDATE OF token_row;

  IF target_sheet_id IS NULL THEN RETURN false; END IF;

  UPDATE public.running_sheet_items item_row
     SET time_text = COALESCE(new_time_text, item_row.time_text),
         description_rich = COALESCE(new_description_rich, item_row.description_rich),
         responsible = COALESCE(new_responsible, item_row.responsible),
         is_section_header = COALESCE(new_is_section_header, item_row.is_section_header),
         is_bold = COALESCE(new_is_bold, item_row.is_bold),
         is_italic = COALESCE(new_is_italic, item_row.is_italic),
         is_underline = COALESCE(new_is_underline, item_row.is_underline),
         updated_at = statement_timestamp()
   WHERE item_row.id = item_id
     AND item_row.sheet_id = target_sheet_id;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.running_sheet_share_tokens token_row
     SET last_accessed_at = statement_timestamp()
   WHERE token_row.id = token_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_running_sheet_item_by_token(
  share_token text,
  at_order_index integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  normalized_token text;
  token_id uuid;
  target_sheet_id uuid;
  new_row public.running_sheet_items%ROWTYPE;
BEGIN
  normalized_token := regexp_replace(btrim(share_token), '=+$', '');
  IF normalized_token IS NULL
     OR length(normalized_token) < 32
     OR length(normalized_token) > 128
     OR normalized_token !~ '^[A-Za-z0-9_-]+$'
     OR at_order_index IS NULL
     OR at_order_index < 0
     OR at_order_index > 10000 THEN
    RETURN NULL;
  END IF;

  SELECT token_row.id, token_row.sheet_id
    INTO token_id, target_sheet_id
    FROM public.running_sheet_share_tokens token_row
   WHERE rtrim(token_row.token, '=') = normalized_token
     AND token_row.permission = 'can_edit'
     AND (token_row.expires_at IS NULL OR token_row.expires_at > statement_timestamp())
   ORDER BY token_row.created_at DESC
   LIMIT 1
   FOR UPDATE OF token_row;

  IF target_sheet_id IS NULL
     OR (SELECT count(*) FROM public.running_sheet_items item_row WHERE item_row.sheet_id = target_sheet_id) >= 500 THEN
    RETURN NULL;
  END IF;

  UPDATE public.running_sheet_items item_row
     SET order_index = item_row.order_index + 1,
         updated_at = statement_timestamp()
   WHERE item_row.sheet_id = target_sheet_id
     AND item_row.order_index >= at_order_index;

  INSERT INTO public.running_sheet_items (
    sheet_id, order_index, time_text, description_rich, responsible, is_section_header
  ) VALUES (
    target_sheet_id, at_order_index, '', '{"text":""}'::jsonb, '', false
  ) RETURNING * INTO new_row;

  UPDATE public.running_sheet_share_tokens token_row
     SET last_accessed_at = statement_timestamp()
   WHERE token_row.id = token_id;

  RETURN to_jsonb(new_row);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_running_sheet_item_by_token(
  share_token text,
  item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  normalized_token text;
  token_id uuid;
  target_sheet_id uuid;
  deleted_order integer;
BEGIN
  normalized_token := regexp_replace(btrim(share_token), '=+$', '');
  IF normalized_token IS NULL
     OR length(normalized_token) < 32
     OR length(normalized_token) > 128
     OR normalized_token !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN false;
  END IF;

  SELECT token_row.id, token_row.sheet_id
    INTO token_id, target_sheet_id
    FROM public.running_sheet_share_tokens token_row
   WHERE rtrim(token_row.token, '=') = normalized_token
     AND token_row.permission = 'can_edit'
     AND (token_row.expires_at IS NULL OR token_row.expires_at > statement_timestamp())
   ORDER BY token_row.created_at DESC
   LIMIT 1
   FOR UPDATE OF token_row;

  IF target_sheet_id IS NULL THEN RETURN false; END IF;

  DELETE FROM public.running_sheet_items item_row
   WHERE item_row.id = item_id
     AND item_row.sheet_id = target_sheet_id
  RETURNING item_row.order_index INTO deleted_order;

  IF deleted_order IS NULL THEN RETURN false; END IF;

  UPDATE public.running_sheet_items item_row
     SET order_index = item_row.order_index - 1,
         updated_at = statement_timestamp()
   WHERE item_row.sheet_id = target_sheet_id
     AND item_row.order_index > deleted_order;

  UPDATE public.running_sheet_share_tokens token_row
     SET last_accessed_at = statement_timestamp()
   WHERE token_row.id = token_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.duplicate_running_sheet_item_by_token(
  share_token text,
  item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  normalized_token text;
  token_id uuid;
  target_sheet_id uuid;
  source_row public.running_sheet_items%ROWTYPE;
  new_row public.running_sheet_items%ROWTYPE;
BEGIN
  normalized_token := regexp_replace(btrim(share_token), '=+$', '');
  IF normalized_token IS NULL
     OR length(normalized_token) < 32
     OR length(normalized_token) > 128
     OR normalized_token !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN NULL;
  END IF;

  SELECT token_row.id, token_row.sheet_id
    INTO token_id, target_sheet_id
    FROM public.running_sheet_share_tokens token_row
   WHERE rtrim(token_row.token, '=') = normalized_token
     AND token_row.permission = 'can_edit'
     AND (token_row.expires_at IS NULL OR token_row.expires_at > statement_timestamp())
   ORDER BY token_row.created_at DESC
   LIMIT 1
   FOR UPDATE OF token_row;

  IF target_sheet_id IS NULL
     OR (SELECT count(*) FROM public.running_sheet_items item_row WHERE item_row.sheet_id = target_sheet_id) >= 500 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO source_row
    FROM public.running_sheet_items item_row
   WHERE item_row.id = item_id
     AND item_row.sheet_id = target_sheet_id
   FOR UPDATE;

  IF source_row.id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.running_sheet_items item_row
     SET order_index = item_row.order_index + 1,
         updated_at = statement_timestamp()
   WHERE item_row.sheet_id = target_sheet_id
     AND item_row.order_index > source_row.order_index;

  INSERT INTO public.running_sheet_items (
    sheet_id, order_index, time_text, description_rich, responsible,
    is_section_header, is_bold, is_italic, is_underline
  ) VALUES (
    target_sheet_id, source_row.order_index + 1, source_row.time_text,
    source_row.description_rich, source_row.responsible,
    source_row.is_section_header, source_row.is_bold,
    source_row.is_italic, source_row.is_underline
  ) RETURNING * INTO new_row;

  UPDATE public.running_sheet_share_tokens token_row
     SET last_accessed_at = statement_timestamp()
   WHERE token_row.id = token_id;
  RETURN to_jsonb(new_row);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_running_sheet_items_by_token(
  share_token text,
  item_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  normalized_token text;
  token_id uuid;
  target_sheet_id uuid;
BEGIN
  normalized_token := regexp_replace(btrim(share_token), '=+$', '');
  IF normalized_token IS NULL
     OR length(normalized_token) < 32
     OR length(normalized_token) > 128
     OR normalized_token !~ '^[A-Za-z0-9_-]+$'
     OR item_ids IS NULL
     OR cardinality(item_ids) > 500 THEN
    RETURN false;
  END IF;

  SELECT token_row.id, token_row.sheet_id
    INTO token_id, target_sheet_id
    FROM public.running_sheet_share_tokens token_row
   WHERE rtrim(token_row.token, '=') = normalized_token
     AND token_row.permission = 'can_edit'
     AND (token_row.expires_at IS NULL OR token_row.expires_at > statement_timestamp())
   ORDER BY token_row.created_at DESC
   LIMIT 1
   FOR UPDATE OF token_row;

  IF target_sheet_id IS NULL
     OR cardinality(item_ids) <> (
       SELECT count(*)::integer
       FROM public.running_sheet_items item_row
       WHERE item_row.sheet_id = target_sheet_id
     )
     OR cardinality(item_ids) <> (
       SELECT count(DISTINCT supplied_id)::integer FROM unnest(item_ids) supplied_id
     )
     OR EXISTS (
       SELECT 1 FROM unnest(item_ids) supplied_id
       WHERE NOT EXISTS (
         SELECT 1 FROM public.running_sheet_items item_row
         WHERE item_row.id = supplied_id
           AND item_row.sheet_id = target_sheet_id
       )
     ) THEN
    RETURN false;
  END IF;

  UPDATE public.running_sheet_items item_row
     SET order_index = (ordered_item.ordinal - 1)::integer,
         updated_at = statement_timestamp()
    FROM unnest(item_ids) WITH ORDINALITY ordered_item(item_id, ordinal)
   WHERE item_row.id = ordered_item.item_id
     AND item_row.sheet_id = target_sheet_id;

  UPDATE public.running_sheet_share_tokens token_row
     SET last_accessed_at = statement_timestamp()
   WHERE token_row.id = token_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_running_sheet_meta_by_token(
  share_token text,
  new_section_label text DEFAULT NULL,
  new_section_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  normalized_token text;
  token_id uuid;
  target_sheet_id uuid;
BEGIN
  normalized_token := regexp_replace(btrim(share_token), '=+$', '');

  IF normalized_token IS NULL
     OR length(normalized_token) < 32
     OR length(normalized_token) > 128
     OR normalized_token !~ '^[A-Za-z0-9_-]+$'
     OR (new_section_label IS NULL AND new_section_notes IS NULL)
     OR length(new_section_label) > 120
     OR length(new_section_notes) > 5000 THEN
    RETURN false;
  END IF;

  SELECT token_row.id, token_row.sheet_id
    INTO token_id, target_sheet_id
    FROM public.running_sheet_share_tokens token_row
   WHERE rtrim(token_row.token, '=') = normalized_token
     AND token_row.permission = 'can_edit'
     AND (token_row.expires_at IS NULL OR token_row.expires_at > statement_timestamp())
   ORDER BY token_row.created_at DESC
   LIMIT 1
   FOR UPDATE OF token_row;

  IF target_sheet_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.running_sheets sheet_row
     SET section_label = CASE
           WHEN new_section_label IS NOT NULL THEN new_section_label
           ELSE sheet_row.section_label
         END,
         section_notes = CASE
           WHEN new_section_notes IS NOT NULL THEN new_section_notes
           ELSE sheet_row.section_notes
         END,
         updated_at = statement_timestamp()
   WHERE sheet_row.id = target_sheet_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.running_sheet_share_tokens token_row
     SET last_accessed_at = statement_timestamp()
   WHERE token_row.id = token_id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_running_sheet_meta_by_token(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_running_sheet_meta_by_token(text, text, text)
  TO anon, authenticated;

COMMENT ON FUNCTION public.update_running_sheet_meta_by_token(text, text, text) IS
  'Updates run-sheet label/notes only for a valid, unexpired can_edit share token.';

-- Function execute privileges are explicit because PostgreSQL grants EXECUTE
-- to PUBLIC by default, including on SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.generate_running_sheet_share_token(uuid, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_running_sheet_share_token(uuid, text, text, integer)
  TO authenticated;

REVOKE ALL ON FUNCTION public.get_running_sheet_by_token(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_running_sheet_by_token(text)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.update_running_sheet_item_by_token(text, uuid, text, jsonb, text, boolean, boolean, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_running_sheet_item_by_token(text, uuid, text, jsonb, text, boolean, boolean, boolean, boolean)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.add_running_sheet_item_by_token(text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_running_sheet_item_by_token(text, integer)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_running_sheet_item_by_token(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_running_sheet_item_by_token(text, uuid)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.duplicate_running_sheet_item_by_token(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_running_sheet_item_by_token(text, uuid)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.reorder_running_sheet_items_by_token(text, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_running_sheet_items_by_token(text, uuid[])
  TO anon, authenticated;
