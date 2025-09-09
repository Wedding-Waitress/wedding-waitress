-- Add timezone-aware date columns to events table
ALTER TABLE public.events 
ADD COLUMN created_date_local DATE,
ADD COLUMN expiry_date_local DATE,
ADD COLUMN event_timezone TEXT;

-- Drop existing function and recreate with new columns
DROP FUNCTION public.get_events_with_guest_count();

CREATE OR REPLACE FUNCTION public.get_events_with_guest_count()
 RETURNS TABLE(id uuid, user_id uuid, name text, date text, venue text, start_time text, finish_time text, guest_limit integer, created_at text, guests_count bigint, event_created text, expiry_date text, created_date_local text, expiry_date_local text, event_timezone text)
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
    e.event_timezone
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
$function$