
CREATE OR REPLACE FUNCTION public.get_seating_chart_by_token(share_token TEXT)
RETURNS TABLE(
  event_id UUID,
  event_name TEXT,
  event_date DATE,
  event_venue TEXT,
  permission TEXT,
  guests JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
BEGIN
  SELECT st.*, e.id as e_id, e.name as e_name, e.date as e_date, e.venue as e_venue
  INTO token_record
  FROM seating_chart_share_tokens st
  JOIN events e ON e.id = st.event_id
  WHERE (
    st.token = share_token
    OR st.token = share_token || '='
    OR st.token = share_token || '=='
  )
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN;
  END IF;

  UPDATE seating_chart_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;

  RETURN QUERY
  SELECT
    token_record.e_id as event_id,
    token_record.e_name as event_name,
    token_record.e_date as event_date,
    token_record.e_venue as event_venue,
    token_record.permission,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'first_name', g.first_name,
          'last_name', g.last_name,
          'table_no', g.table_no,
          'table_name', t.name,
          'seat_no', g.seat_no,
          'dietary', g.dietary,
          'relation_display', g.relation_display,
          'rsvp', g.rsvp
        ) ORDER BY g.first_name, g.last_name
      ), '[]'::jsonb)
      FROM guests g
      LEFT JOIN tables t ON t.id = g.table_id
      WHERE g.event_id = token_record.e_id
    ) as guests;
END;
$$;
