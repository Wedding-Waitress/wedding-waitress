
-- Drop existing function so we can change its return type
DROP FUNCTION IF EXISTS public.get_running_sheet_by_token(text);

-- Recreate with section_notes and section_label in return type
CREATE OR REPLACE FUNCTION public.get_running_sheet_by_token(share_token text)
 RETURNS TABLE(sheet_id uuid, event_id uuid, event_name text, event_date date, event_venue text, start_time time without time zone, finish_time time without time zone, ceremony_date date, ceremony_venue text, ceremony_start_time time without time zone, ceremony_finish_time time without time zone, permission text, items jsonb, section_notes text, section_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  token_record RECORD;
BEGIN
  SELECT st.*, rs.id as rs_id, rs.event_id as rs_event_id, rs.section_notes as rs_section_notes, rs.section_label as rs_section_label
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
          'is_section_header', i.is_section_header,
          'is_bold', COALESCE(i.is_bold, false),
          'is_italic', COALESCE(i.is_italic, false),
          'is_underline', COALESCE(i.is_underline, false)
        ) ORDER BY i.order_index
      ), '[]'::jsonb)
      FROM running_sheet_items i
      WHERE i.sheet_id = token_record.rs_id
    ) as items,
    token_record.rs_section_notes as section_notes,
    COALESCE(token_record.rs_section_label, 'Running Sheet') as section_label
  FROM events e
  WHERE e.id = token_record.rs_event_id;
END;
$function$;

-- Create RPC for public view to update section meta (notes/label) by token
CREATE OR REPLACE FUNCTION public.update_running_sheet_meta_by_token(
  share_token text,
  new_section_notes text DEFAULT NULL,
  new_section_label text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token_record RECORD;
BEGIN
  SELECT st.sheet_id
  INTO token_record
  FROM running_sheet_share_tokens st
  WHERE (
    st.token = share_token
    OR st.token = share_token || '='
    OR st.token = share_token || '=='
  )
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN false;
  END IF;

  UPDATE running_sheets
  SET
    section_notes = COALESCE(new_section_notes, section_notes),
    section_label = COALESCE(new_section_label, section_label)
  WHERE id = token_record.sheet_id;

  RETURN true;
END;
$function$;
