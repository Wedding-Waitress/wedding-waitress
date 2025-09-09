-- Drop the problematic view
DROP VIEW public.events_with_guest_count;

-- Create a security definer function to get events with guest count
CREATE OR REPLACE FUNCTION public.get_events_with_guest_count()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  date DATE,
  venue TEXT,
  start_time TIME,
  finish_time TIME,
  guest_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  guests_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.user_id,
    e.name,
    e.date,
    e.venue,
    e.start_time,
    e.finish_time,
    e.guest_limit,
    e.created_at,
    COALESCE(g.guest_count, 0) as guests_count
  FROM public.events e
  LEFT JOIN (
    SELECT event_id, COUNT(*) as guest_count
    FROM public.guests
    WHERE user_id = auth.uid()
    GROUP BY event_id
  ) g ON e.id = g.event_id
  WHERE e.user_id = auth.uid();
$$;