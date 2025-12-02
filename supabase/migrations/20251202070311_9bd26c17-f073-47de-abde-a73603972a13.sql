-- Update get_public_event_with_data_secure to return guest_table_id
DROP FUNCTION IF EXISTS public.get_public_event_with_data_secure(text, text);

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
  guest_table_id uuid,
  guest_seat_no integer,
  guest_rsvp text,
  guest_dietary text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id, 
    e.name, 
    e.date::text, 
    e.venue, 
    e.start_time::text, 
    e.finish_time::text, 
    e.partner1_name, 
    e.partner2_name,
    g.id, 
    g.first_name, 
    g.last_name, 
    g.table_no, 
    g.table_id,
    g.seat_no, 
    g.rsvp, 
    g.dietary
  FROM events e 
  LEFT JOIN guests g ON e.id = g.event_id
  LEFT JOIN guest_access_tokens gat ON (g.id = gat.guest_id AND gat.access_token = access_token AND gat.expires_at > now())
  WHERE e.slug = event_slug 
    AND e.qr_apply_to_live_view = true 
    AND (access_token IS NULL OR gat.guest_id IS NOT NULL)
  ORDER BY g.first_name, g.last_name;
$$;

-- Create new function to get public table data (bypasses RLS for public guests)
CREATE OR REPLACE FUNCTION public.get_public_table_data(
  p_table_id uuid,
  p_event_id uuid
)
RETURNS TABLE(
  table_id uuid,
  table_no integer,
  table_name text,
  limit_seats integer,
  table_notes text,
  guest_id uuid,
  guest_first_name text,
  guest_last_name text,
  guest_seat_no integer,
  guest_dietary text,
  guest_rsvp text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.table_no,
    t.name,
    t.limit_seats,
    t.notes,
    g.id,
    g.first_name,
    g.last_name,
    g.seat_no,
    g.dietary,
    g.rsvp
  FROM tables t
  LEFT JOIN guests g ON g.table_id = t.id
  WHERE t.id = p_table_id
    AND t.event_id = p_event_id
    AND EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = p_event_id 
        AND e.qr_apply_to_live_view = true
    )
  ORDER BY g.seat_no NULLS LAST;
$$;