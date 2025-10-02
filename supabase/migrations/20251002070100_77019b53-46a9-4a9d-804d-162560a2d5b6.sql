-- ============================================
-- SECURITY FIX: Implement Secure Guest Access (Clean Version)
-- ============================================

-- 1. Create guest access tokens table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_access_tokens') THEN
    CREATE TABLE public.guest_access_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
      guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
      access_token text NOT NULL UNIQUE,
      expires_at timestamp with time zone NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      last_used_at timestamp with time zone,
      UNIQUE(event_id, guest_id)
    );
    
    ALTER TABLE public.guest_access_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 2. Create indexes (drop first if exists)
DROP INDEX IF EXISTS public.idx_guest_access_tokens_token;
CREATE INDEX idx_guest_access_tokens_token ON public.guest_access_tokens(access_token);

DROP INDEX IF EXISTS public.idx_guest_access_tokens_expires;
CREATE INDEX idx_guest_access_tokens_expires ON public.guest_access_tokens(expires_at);

-- 3. Create/Replace RLS policies for guest_access_tokens
DROP POLICY IF EXISTS "Event owners can view tokens for their events" ON public.guest_access_tokens;
CREATE POLICY "Event owners can view tokens for their events"
ON public.guest_access_tokens FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = guest_access_tokens.event_id AND events.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Event owners can create tokens for their events" ON public.guest_access_tokens;
CREATE POLICY "Event owners can create tokens for their events"
ON public.guest_access_tokens FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = guest_access_tokens.event_id AND events.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Event owners can delete tokens for their events" ON public.guest_access_tokens;
CREATE POLICY "Event owners can delete tokens for their events"
ON public.guest_access_tokens FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = guest_access_tokens.event_id AND events.user_id = auth.uid()
));

-- 4. Create security definer functions
CREATE OR REPLACE FUNCTION public.validate_guest_access(_guest_id uuid, _access_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guest_access_tokens
    WHERE guest_id = _guest_id AND access_token = _access_token AND expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_guest_access_token(
  _event_id uuid, _guest_id uuid, _validity_days integer DEFAULT 30
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _token text; _expires_at timestamp with time zone;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized access to event';
  END IF;
  _token := encode(gen_random_bytes(32), 'base64');
  _token := replace(replace(_token, '/', '_'), '+', '-');
  _expires_at := now() + (_validity_days || ' days')::interval;
  INSERT INTO public.guest_access_tokens (event_id, guest_id, access_token, expires_at)
  VALUES (_event_id, _guest_id, _token, _expires_at)
  ON CONFLICT (event_id, guest_id) DO UPDATE SET 
    access_token = EXCLUDED.access_token, expires_at = EXCLUDED.expires_at, created_at = now();
  RETURN _token;
END;
$$;

-- 5. DROP dangerous public policies on guests table
DROP POLICY IF EXISTS "Public can read guests for live view events" ON public.guests;
DROP POLICY IF EXISTS "Public can update guests for live view events" ON public.guests;

-- 6. Restrict live_view_settings public access
DROP POLICY IF EXISTS "Public can read settings for live view events" ON public.live_view_settings;

CREATE OR REPLACE FUNCTION public.get_public_live_view_settings(_event_slug text)
RETURNS TABLE (show_rsvp_invite boolean, show_search boolean, show_ceremony boolean, 
  show_reception boolean, show_update_details boolean, show_invite_video boolean, show_welcome_video boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lvs.show_rsvp_invite, lvs.show_search, lvs.show_ceremony, lvs.show_reception,
    lvs.show_update_details, lvs.show_invite_video, lvs.show_welcome_video
  FROM public.live_view_settings lvs
  JOIN public.events e ON e.id = lvs.event_id
  WHERE e.slug = _event_slug AND e.qr_apply_to_live_view = true;
$$;

-- 7. Secure guest lookup function
CREATE OR REPLACE FUNCTION public.get_guest_by_token(_access_token text)
RETURNS TABLE (guest_id uuid, first_name text, last_name text, table_no integer, seat_no integer, 
  rsvp text, dietary text, event_name text, event_date date, event_venue text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT g.id, g.first_name, g.last_name, g.table_no, g.seat_no, g.rsvp, g.dietary,
    e.name, e.date, e.venue
  FROM public.guest_access_tokens gat
  JOIN public.guests g ON g.id = gat.guest_id
  JOIN public.events e ON e.id = gat.event_id
  WHERE gat.access_token = _access_token AND gat.expires_at > now() AND e.qr_apply_to_live_view = true;
$$;

-- 8. Secure guest update function
CREATE OR REPLACE FUNCTION public.update_guest_with_token(
  _access_token text, _rsvp text DEFAULT NULL, _dietary text DEFAULT NULL, 
  _mobile text DEFAULT NULL, _email text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _guest_id uuid; _event_id uuid;
BEGIN
  SELECT gat.guest_id, gat.event_id INTO _guest_id, _event_id
  FROM public.guest_access_tokens gat JOIN public.events e ON e.id = gat.event_id
  WHERE gat.access_token = _access_token AND gat.expires_at > now() AND e.qr_apply_to_live_view = true;
  IF _guest_id IS NULL THEN RETURN false; END IF;
  UPDATE public.guests SET rsvp = COALESCE(_rsvp, rsvp), dietary = COALESCE(_dietary, dietary),
    mobile = COALESCE(_mobile, mobile), email = COALESCE(_email, email) WHERE id = _guest_id;
  INSERT INTO public.guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _guest_id, jsonb_build_object('rsvp', _rsvp, 'dietary', _dietary, 
    'mobile', _mobile, 'email', _email), 'guest_with_token');
  UPDATE public.guest_access_tokens SET last_used_at = now() WHERE access_token = _access_token;
  RETURN true;
END;
$$;

-- 9. Remove old insecure function and create secure version
DROP FUNCTION IF EXISTS public.get_public_event_with_data(text);

CREATE OR REPLACE FUNCTION public.get_public_event_with_data_secure(event_slug text, access_token text DEFAULT NULL)
RETURNS TABLE(event_id uuid, event_name text, event_date text, event_venue text, event_start_time text,
  event_finish_time text, partner1_name text, partner2_name text, guest_id uuid, guest_first_name text,
  guest_last_name text, guest_table_no integer, guest_seat_no integer, guest_rsvp text, guest_dietary text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.name, e.date::text, e.venue, e.start_time::text, e.finish_time::text, e.partner1_name, e.partner2_name,
    g.id, g.first_name, g.last_name, g.table_no, g.seat_no, g.rsvp, g.dietary
  FROM events e LEFT JOIN guests g ON e.id = g.event_id
  LEFT JOIN guest_access_tokens gat ON (g.id = gat.guest_id AND gat.access_token = access_token AND gat.expires_at > now())
  WHERE e.slug = event_slug AND e.qr_apply_to_live_view = true AND (access_token IS NULL OR gat.guest_id IS NOT NULL)
  ORDER BY g.first_name, g.last_name;
$$;

-- 10. Access attempts tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_access_attempts') THEN
    CREATE TABLE public.guest_access_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      access_token text NOT NULL,
      ip_address inet,
      attempted_at timestamp with time zone NOT NULL DEFAULT now(),
      success boolean NOT NULL DEFAULT false
    );
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_guest_access_attempts_token;
CREATE INDEX idx_guest_access_attempts_token ON public.guest_access_attempts(access_token);

DROP INDEX IF EXISTS public.idx_guest_access_attempts_time;
CREATE INDEX idx_guest_access_attempts_time ON public.guest_access_attempts(attempted_at);

CREATE OR REPLACE FUNCTION public.cleanup_old_access_attempts()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  DELETE FROM public.guest_access_attempts WHERE attempted_at < now() - interval '24 hours';
$$;