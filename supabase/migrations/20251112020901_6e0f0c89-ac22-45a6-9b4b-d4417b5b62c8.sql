-- Drop and recreate get_events_with_guest_count function with unassigned count
DROP FUNCTION IF EXISTS public.get_events_with_guest_count();

CREATE OR REPLACE FUNCTION public.get_events_with_guest_count()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  date text,
  venue text,
  start_time text,
  finish_time text,
  guest_limit integer,
  created_at text,
  guests_count bigint,
  unassigned_guests_count bigint,
  event_created text,
  expiry_date text,
  created_date_local text,
  expiry_date_local text,
  event_timezone text,
  partner1_name text,
  partner2_name text,
  slug text,
  rsvp_deadline text
)
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
    COALESCE(g.unassigned_count, 0) as unassigned_guests_count,
    e.event_created::text,
    e.expiry_date::text,
    e.created_date_local::text,
    e.expiry_date_local::text,
    e.event_timezone,
    e.partner1_name,
    e.partner2_name,
    e.slug,
    e.rsvp_deadline::text
  FROM events e
  LEFT JOIN (
    SELECT 
      event_id,
      COUNT(*) as guest_count,
      COUNT(CASE WHEN table_id IS NULL THEN 1 END) as unassigned_count
    FROM guests
    GROUP BY event_id
  ) g ON e.id = g.event_id
  WHERE e.user_id = auth.uid()
  ORDER BY e.created_at DESC;
$function$;