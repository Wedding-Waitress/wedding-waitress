-- Create unique index on event slugs to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique ON events(slug);

-- Create trigger to ensure all events have slugs
CREATE OR REPLACE FUNCTION public.ensure_event_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate slug if it's not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on events table
DROP TRIGGER IF EXISTS trigger_ensure_event_slug ON events;
CREATE TRIGGER trigger_ensure_event_slug
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_event_slug();

-- Create public function to get event and guest data (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_public_event_with_data(event_slug text)
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
  guest_table_id uuid,
  guest_table_no integer,
  guest_seat_no integer,
  guest_rsvp text,
  guest_dietary text,
  guest_mobile text,
  guest_email text,
  guest_family_group text,
  table_id uuid,
  table_name text,
  table_no integer,
  table_limit_seats integer,
  table_notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    g.table_id as guest_table_id,
    g.table_no as guest_table_no,
    g.seat_no as guest_seat_no,
    g.rsvp as guest_rsvp,
    g.dietary as guest_dietary,
    g.mobile as guest_mobile,
    g.email as guest_email,
    g.family_group as guest_family_group,
    t.id as table_id,
    t.name as table_name,
    t.table_no,
    t.limit_seats as table_limit_seats,
    t.notes as table_notes
  FROM events e
  LEFT JOIN guests g ON e.id = g.event_id
  LEFT JOIN tables t ON g.table_id = t.id
  WHERE e.slug = event_slug
  ORDER BY g.first_name, g.last_name;
$function$;