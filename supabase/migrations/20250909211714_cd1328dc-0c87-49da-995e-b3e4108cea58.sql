-- Drop the existing function and recreate it with the new columns
DROP FUNCTION IF EXISTS public.get_events_with_guest_count();

CREATE OR REPLACE FUNCTION public.get_events_with_guest_count()
RETURNS TABLE (
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
  event_created text,
  expiry_date text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
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
    e.expiry_date::text
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
$$;