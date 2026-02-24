-- Drop ALL overloads of the function
DROP FUNCTION IF EXISTS public.get_dj_mc_questionnaire_by_token(text);

-- Recreate with correct signature
CREATE OR REPLACE FUNCTION public.get_dj_mc_questionnaire_by_token(share_token text)
RETURNS TABLE(
  questionnaire_id uuid,
  event_id uuid,
  event_name text,
  event_date date,
  event_venue text,
  start_time time without time zone,
  finish_time time without time zone,
  ceremony_date date,
  ceremony_venue text,
  ceremony_start_time time without time zone,
  ceremony_finish_time time without time zone,
  permission text,
  sections jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
BEGIN
  SELECT st.*, q.id as q_id, q.event_id as q_event_id
  INTO token_record
  FROM dj_mc_share_tokens st
  JOIN dj_mc_questionnaires q ON q.id = st.questionnaire_id
  WHERE (
    st.token = share_token 
    OR st.token = share_token || '=' 
    OR st.token = share_token || '=='
  )
    AND (st.expires_at IS NULL OR st.expires_at > now());
  
  IF token_record IS NULL THEN
    RETURN;
  END IF;
  
  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  
  RETURN QUERY
  SELECT 
    token_record.q_id as questionnaire_id,
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
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'section_type', s.section_type,
          'section_label', s.section_label,
          'order_index', s.order_index,
          'notes', s.notes,
          'is_collapsed', s.is_collapsed,
          'items', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'row_label', i.row_label,
                'value_text', i.value_text,
                'music_url', i.music_url,
                'song_title_artist', i.song_title_artist,
                'pronunciation_audio_url', i.pronunciation_audio_url,
                'duration', i.duration,
                'order_index', i.order_index,
                'is_default', i.is_default
              ) ORDER BY i.order_index
            ), '[]'::jsonb)
            FROM dj_mc_items i
            WHERE i.section_id = s.id
          )
        ) ORDER BY s.order_index
      )
      FROM dj_mc_sections s
      WHERE s.questionnaire_id = token_record.q_id
    ) as sections
  FROM events e
  WHERE e.id = token_record.q_event_id;
END;
$$;