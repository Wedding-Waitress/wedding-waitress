-- Update the get_events_with_guest_count function to include slug field
CREATE OR REPLACE FUNCTION public.get_events_with_guest_count()
 RETURNS TABLE(id uuid, user_id uuid, name text, date text, venue text, start_time text, finish_time text, guest_limit integer, created_at text, guests_count bigint, event_created text, expiry_date text, created_date_local text, expiry_date_local text, event_timezone text, partner1_name text, partner2_name text, slug text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    e.id,
    e.user_id,
    e.name,
    e.date::text,
    e.venue,
    e.start_time::text,
    e.finish_time::text,
    e.guest_limit::integer,
    e.created_at::text,
    COALESCE(g.guest_count, 0) as guests_count,
    e.event_created::text,
    e.expiry_date::text,
    e.created_date_local::text,
    e.expiry_date_local::text,
    e.event_timezone,
    e.partner1_name,
    e.partner2_name,
    e.slug
  FROM events e
  LEFT JOIN (
    SELECT 
      event_id,
      COUNT(*) as guest_count
    FROM guests
    GROUP BY event_id
  ) g ON e.id = g.event_id
  WHERE e.user_id = auth.uid()
  ORDER BY e.created_at DESC;
$function$;

-- Update trigger to automatically generate slug when creating new events
CREATE OR REPLACE FUNCTION public.ensure_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate slug if it's not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate slugs on insert
DROP TRIGGER IF EXISTS ensure_event_slug_trigger ON public.events;
CREATE TRIGGER ensure_event_slug_trigger
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.ensure_event_slug();