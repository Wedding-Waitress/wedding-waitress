
DROP FUNCTION IF EXISTS public.get_running_sheet_by_token(text);

CREATE OR REPLACE FUNCTION public.get_running_sheet_by_token(share_token text)
 RETURNS TABLE(sheet_id uuid, event_id uuid, event_name text, event_date date, event_venue text, start_time time, finish_time time, ceremony_date date, ceremony_venue text, ceremony_start_time time, ceremony_finish_time time, permission text, items jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  token_record RECORD;
BEGIN
  SELECT st.*, rs.id as rs_id, rs.event_id as rs_event_id
  INTO token_record
  FROM running_sheet_share_tokens st
  JOIN running_sheets rs ON rs.id = st.sheet_id
  WHERE (
    st.token = share_token
    OR st.token = share_token || '='
    OR st.token = share_token || '=='
  )
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN;
  END IF;

  UPDATE running_sheet_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;

  RETURN QUERY
  SELECT
    token_record.rs_id as sheet_id,
    e.id as event_id,
    e.name as event_name,
    e.date as event_date,
    e.venue as event_venue,
    e.start_time,
    e.finish_time,
    e.ceremony_date,
    e.ceremony_venue,
    e.ceremony_start_time,
    e.ceremony_finish_time,
    token_record.permission,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'time_text', i.time_text,
          'description_rich', i.description_rich,
          'responsible', i.responsible,
          'order_index', i.order_index,
          'is_section_header', i.is_section_header
        ) ORDER BY i.order_index
      ), '[]'::jsonb)
      FROM running_sheet_items i
      WHERE i.sheet_id = token_record.rs_id
    ) as items
  FROM events e
  WHERE e.id = token_record.rs_event_id;
END;
$function$;
