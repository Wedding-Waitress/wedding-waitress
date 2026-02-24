DROP FUNCTION IF EXISTS public.get_dj_mc_questionnaire_by_token(text);

CREATE OR REPLACE FUNCTION public.get_dj_mc_questionnaire_by_token(share_token text)
RETURNS TABLE(
  questionnaire_id uuid,
  event_id uuid,
  event_name text,
  event_date date,
  event_venue text,
  start_time time,
  finish_time time,
  ceremony_date date,
  ceremony_venue text,
  ceremony_start_time time,
  ceremony_finish_time time,
  permission text,
  sections json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_accessed_at
  UPDATE dj_mc_share_tokens
  SET last_accessed_at = now()
  WHERE token = share_token
    AND (expires_at IS NULL OR expires_at > now());

  RETURN QUERY
  SELECT
    q.id AS questionnaire_id,
    q.event_id,
    e.name AS event_name,
    e.date AS event_date,
    e.venue AS event_venue,
    e.start_time,
    e.finish_time,
    e.ceremony_date,
    e.ceremony_venue,
    e.ceremony_start_time,
    e.ceremony_finish_time,
    st.permission,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', s.id,
            'section_label', s.section_label,
            'section_type', s.section_type,
            'notes', s.notes,
            'order_index', s.order_index,
            'items', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', i.id,
                    'row_label', i.row_label,
                    'value_text', i.value_text,
                    'song_title_artist', i.song_title_artist,
                    'music_url', i.music_url,
                    'duration', i.duration,
                    'order_index', i.order_index,
                    'pronunciation_audio_url', i.pronunciation_audio_url
                  )
                  ORDER BY i.order_index
                )
                FROM dj_mc_items i
                WHERE i.section_id = s.id
              ),
              '[]'::json
            )
          )
          ORDER BY s.order_index
        )
        FROM dj_mc_sections s
        WHERE s.questionnaire_id = q.id
      ),
      '[]'::json
    ) AS sections
  FROM dj_mc_share_tokens st
  JOIN dj_mc_questionnaires q ON q.id = st.questionnaire_id
  JOIN events e ON e.id = q.event_id
  WHERE st.token = share_token
    AND (st.expires_at IS NULL OR st.expires_at > now());
END;
$$;