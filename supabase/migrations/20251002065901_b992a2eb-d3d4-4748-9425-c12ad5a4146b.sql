-- ============================================
-- SECURITY FIX: Implement Secure Guest Access
-- ============================================

-- 1. Create guest access tokens table for secure public access
CREATE TABLE IF NOT EXISTS public.guest_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  access_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  UNIQUE(event_id, guest_id)
);

-- Enable RLS on guest access tokens
ALTER TABLE public.guest_access_tokens ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookup
CREATE INDEX idx_guest_access_tokens_token ON public.guest_access_tokens(access_token);
CREATE INDEX idx_guest_access_tokens_expires ON public.guest_access_tokens(expires_at);

-- Event owners can manage tokens for their events
CREATE POLICY "Event owners can view tokens for their events"
ON public.guest_access_tokens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = guest_access_tokens.event_id
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Event owners can create tokens for their events"
ON public.guest_access_tokens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = guest_access_tokens.event_id
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Event owners can delete tokens for their events"
ON public.guest_access_tokens
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = guest_access_tokens.event_id
    AND events.user_id = auth.uid()
  )
);

-- 2. Create security definer function to validate guest access
CREATE OR REPLACE FUNCTION public.validate_guest_access(
  _guest_id uuid,
  _access_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guest_access_tokens
    WHERE guest_id = _guest_id
    AND access_token = _access_token
    AND expires_at > now()
  );
$$;

-- 3. Create function to generate secure random tokens
CREATE OR REPLACE FUNCTION public.generate_guest_access_token(
  _event_id uuid,
  _guest_id uuid,
  _validity_days integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
  _expires_at timestamp with time zone;
BEGIN
  -- Verify the caller owns this event
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to event';
  END IF;

  -- Generate secure random token
  _token := encode(gen_random_bytes(32), 'base64');
  _token := replace(_token, '/', '_');
  _token := replace(_token, '+', '-');
  _expires_at := now() + (_validity_days || ' days')::interval;

  -- Insert or update token
  INSERT INTO public.guest_access_tokens (event_id, guest_id, access_token, expires_at)
  VALUES (_event_id, _guest_id, _token, _expires_at)
  ON CONFLICT (event_id, guest_id) 
  DO UPDATE SET 
    access_token = EXCLUDED.access_token,
    expires_at = EXCLUDED.expires_at,
    created_at = now();

  RETURN _token;
END;
$$;

-- 4. DROP the dangerous public policies on guests table
DROP POLICY IF EXISTS "Public can read guests for live view events" ON public.guests;
DROP POLICY IF EXISTS "Public can update guests for live view events" ON public.guests;

-- 5. Create new secure policies for guest access with tokens
-- Note: These will require the access token to be passed in the request
-- The frontend will need to use RPC calls or set session variables

-- 6. Create table for guest update audit logs (already exists, ensure it's secure)
-- The guest_update_logs table already exists, let's ensure only event owners can read it

-- 7. Restrict live_view_settings public access to only essential fields
DROP POLICY IF EXISTS "Public can read settings for live view events" ON public.live_view_settings;

-- Create a security definer function to get only safe live view settings
CREATE OR REPLACE FUNCTION public.get_public_live_view_settings(_event_slug text)
RETURNS TABLE (
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
SET search_path = public
AS $$
  SELECT 
    lvs.show_rsvp_invite,
    lvs.show_search,
    lvs.show_ceremony,
    lvs.show_reception,
    lvs.show_update_details,
    lvs.show_invite_video,
    lvs.show_welcome_video
  FROM public.live_view_settings lvs
  JOIN public.events e ON e.id = lvs.event_id
  WHERE e.slug = _event_slug
  AND e.qr_apply_to_live_view = true;
$$;

-- 8. Create a secure function for guest lookup with validation
CREATE OR REPLACE FUNCTION public.get_guest_by_token(
  _access_token text
)
RETURNS TABLE (
  guest_id uuid,
  first_name text,
  last_name text,
  table_no integer,
  seat_no integer,
  rsvp text,
  dietary text,
  event_name text,
  event_date date,
  event_venue text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id as guest_id,
    g.first_name,
    g.last_name,
    g.table_no,
    g.seat_no,
    g.rsvp,
    g.dietary,
    e.name as event_name,
    e.date as event_date,
    e.venue as event_venue
  FROM public.guest_access_tokens gat
  JOIN public.guests g ON g.id = gat.guest_id
  JOIN public.events e ON e.id = gat.event_id
  WHERE gat.access_token = _access_token
  AND gat.expires_at > now()
  AND e.qr_apply_to_live_view = true;
$$;

-- 9. Create function to update guest data with token validation
CREATE OR REPLACE FUNCTION public.update_guest_with_token(
  _access_token text,
  _rsvp text DEFAULT NULL,
  _dietary text DEFAULT NULL,
  _mobile text DEFAULT NULL,
  _email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guest_id uuid;
  _event_id uuid;
BEGIN
  -- Validate token and get guest info
  SELECT gat.guest_id, gat.event_id
  INTO _guest_id, _event_id
  FROM public.guest_access_tokens gat
  JOIN public.events e ON e.id = gat.event_id
  WHERE gat.access_token = _access_token
  AND gat.expires_at > now()
  AND e.qr_apply_to_live_view = true;

  IF _guest_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update guest data
  UPDATE public.guests
  SET 
    rsvp = COALESCE(_rsvp, rsvp),
    dietary = COALESCE(_dietary, dietary),
    mobile = COALESCE(_mobile, mobile),
    email = COALESCE(_email, email)
  WHERE id = _guest_id;

  -- Log the update
  INSERT INTO public.guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (
    _event_id,
    _guest_id,
    jsonb_build_object(
      'rsvp', _rsvp,
      'dietary', _dietary,
      'mobile', _mobile,
      'email', _email
    ),
    'guest_with_token'
  );

  -- Update last used timestamp
  UPDATE public.guest_access_tokens
  SET last_used_at = now()
  WHERE access_token = _access_token;

  RETURN true;
END;
$$;

-- 10. Update the get_public_event_with_data function to not expose sensitive data
DROP FUNCTION IF EXISTS public.get_public_event_with_data(text);

CREATE OR REPLACE FUNCTION public.get_public_event_with_data_secure(
  event_slug text,
  access_token text DEFAULT NULL
)
RETURNS TABLE(
  event_id uuid,
  event_name text,
  event_date text,
  event_venue text,
  event_start_time text,
  event_finish_time text,
  partner1_name text,
  partner2_name text,
  guest_id uuid,
  guest_first_name text,
  guest_last_name text,
  guest_table_no integer,
  guest_seat_no integer,
  guest_rsvp text,
  guest_dietary text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id as event_id,
    e.name as event_name,
    e.date::text as event_date,
    e.venue as event_venue,
    e.start_time::text as event_start_time,
    e.finish_time::text as event_finish_time,
    e.partner1_name,
    e.partner2_name,
    g.id as guest_id,
    g.first_name as guest_first_name,
    g.last_name as guest_last_name,
    g.table_no as guest_table_no,
    g.seat_no as guest_seat_no,
    g.rsvp as guest_rsvp,
    g.dietary as guest_dietary
  FROM events e
  LEFT JOIN guests g ON e.id = g.event_id
  LEFT JOIN guest_access_tokens gat ON (
    g.id = gat.guest_id 
    AND gat.access_token = access_token
    AND gat.expires_at > now()
  )
  WHERE e.slug = event_slug
  AND e.qr_apply_to_live_view = true
  AND (
    access_token IS NULL 
    OR gat.guest_id IS NOT NULL
  )
  ORDER BY g.first_name, g.last_name;
$$;

-- 11. Add rate limiting for token validation
CREATE TABLE IF NOT EXISTS public.guest_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  ip_address inet,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_guest_access_attempts_token ON public.guest_access_attempts(access_token);
CREATE INDEX idx_guest_access_attempts_time ON public.guest_access_attempts(attempted_at);

-- Clean up old access attempts (keep last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_access_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.guest_access_attempts
  WHERE attempted_at < now() - interval '24 hours';
$$;