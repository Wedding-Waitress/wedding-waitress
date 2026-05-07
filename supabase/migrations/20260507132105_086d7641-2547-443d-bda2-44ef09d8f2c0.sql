
-- Columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS account_id text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_id text;

-- Random helper
CREATE OR REPLACE FUNCTION public._random_id8()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  out text := '';
  b bytea;
  i int;
BEGIN
  b := extensions.gen_random_bytes(8);
  FOR i IN 0..7 LOOP
    out := out || substr(chars, (get_byte(b, i) % 36) + 1, 1);
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_account_id(_country text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cc text; candidate text; attempts int := 0;
BEGIN
  cc := UPPER(COALESCE(NULLIF(TRIM(_country), ''), 'XX'));
  IF cc !~ '^[A-Z]{2}$' THEN cc := 'XX'; END IF;
  LOOP
    candidate := cc || '-' || public._random_id8();
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE account_id = candidate) THEN RETURN candidate; END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'Failed to generate unique account_id'; END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_event_id()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE candidate text; attempts int := 0;
BEGIN
  LOOP
    candidate := 'EV-' || public._random_id8();
    IF NOT EXISTS (SELECT 1 FROM public.events WHERE event_id = candidate) THEN RETURN candidate; END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'Failed to generate unique event_id'; END IF;
  END LOOP;
END; $$;

-- INSERT triggers (always overwrite client values)
CREATE OR REPLACE FUNCTION public.profiles_set_account_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.account_id := public.generate_account_id(NEW.country_code); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.events_set_event_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.event_id := public.generate_event_id(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS profiles_set_account_id_trg ON public.profiles;
CREATE TRIGGER profiles_set_account_id_trg BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_set_account_id();

DROP TRIGGER IF EXISTS events_set_event_id_trg ON public.events;
CREATE TRIGGER events_set_event_id_trg BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_set_event_id();

-- Immutability
CREATE OR REPLACE FUNCTION public.profiles_account_id_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.account_id IS NOT NULL AND NEW.account_id IS DISTINCT FROM OLD.account_id THEN
    RAISE EXCEPTION 'account_id is immutable';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.events_event_id_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.event_id IS NOT NULL AND NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    RAISE EXCEPTION 'event_id is immutable';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_account_id_immutable_trg ON public.profiles;
CREATE TRIGGER profiles_account_id_immutable_trg BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_account_id_immutable();

DROP TRIGGER IF EXISTS events_event_id_immutable_trg ON public.events;
CREATE TRIGGER events_event_id_immutable_trg BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_event_id_immutable();

-- Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, country_code FROM public.profiles WHERE account_id IS NULL LOOP
    UPDATE public.profiles SET account_id = public.generate_account_id(r.country_code) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM public.events WHERE event_id IS NULL LOOP
    UPDATE public.events SET event_id = public.generate_event_id() WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_account_id_unique ON public.profiles(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS events_event_id_unique ON public.events(event_id);

ALTER TABLE public.profiles ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN event_id SET NOT NULL;

-- Update RPC to expose event_id
DROP FUNCTION IF EXISTS public.get_events_with_guest_count();
CREATE FUNCTION public.get_events_with_guest_count()
 RETURNS TABLE(id uuid, user_id uuid, name text, date text, venue text, start_time text, finish_time text, guest_limit integer, created_at text, guests_count bigint, unassigned_guests_count bigint, event_created text, expiry_date text, created_date_local text, expiry_date_local text, event_timezone text, partner1_name text, partner2_name text, slug text, rsvp_deadline text, event_type text, event_id text)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 
    e.id, e.user_id, e.name, e.date::text, e.venue,
    e.start_time::text, e.finish_time::text, e.guest_limit::integer, e.created_at::text,
    COALESCE(g.guest_count, 0), COALESCE(g.unassigned_count, 0),
    e.event_created::text, e.expiry_date::text, e.created_date_local::text, e.expiry_date_local::text,
    e.event_timezone, e.partner1_name, e.partner2_name, e.slug, e.rsvp_deadline::text, e.event_type,
    e.event_id
  FROM events e
  LEFT JOIN (
    SELECT event_id as ev, COUNT(*) as guest_count,
           COUNT(CASE WHEN table_id IS NULL THEN 1 END) as unassigned_count
    FROM guests GROUP BY event_id
  ) g ON e.id = g.ev
  WHERE e.user_id = auth.uid()
  ORDER BY e.created_at DESC;
$$;
