
CREATE OR REPLACE FUNCTION public.update_dj_mc_item_by_token(share_token text, item_id uuid, new_value_text text DEFAULT NULL::text, new_music_url text DEFAULT NULL::text, new_row_label text DEFAULT NULL::text, new_song_title_artist text DEFAULT NULL::text, new_duration text DEFAULT NULL::text, new_pronunciation_audio_url text DEFAULT NULL::text, new_is_bold boolean DEFAULT NULL::boolean, new_is_italic boolean DEFAULT NULL::boolean, new_is_underline boolean DEFAULT NULL::boolean, new_is_section_header boolean DEFAULT NULL::boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  token_record RECORD;
  item_record RECORD;
BEGIN
  SELECT st.*, q.id as q_id
  INTO token_record
  FROM dj_mc_share_tokens st
  JOIN dj_mc_questionnaires q ON q.id = st.questionnaire_id
  WHERE (st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '==')
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT i.* INTO item_record
  FROM dj_mc_items i
  JOIN dj_mc_sections s ON s.id = i.section_id
  WHERE i.id = item_id AND s.questionnaire_id = token_record.q_id;

  IF item_record IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE dj_mc_items
  SET
    value_text = COALESCE(new_value_text, value_text),
    music_url = COALESCE(new_music_url, music_url),
    row_label = COALESCE(new_row_label, row_label),
    song_title_artist = COALESCE(new_song_title_artist, song_title_artist),
    duration = COALESCE(new_duration, duration),
    pronunciation_audio_url = COALESCE(new_pronunciation_audio_url, pronunciation_audio_url),
    is_bold = COALESCE(new_is_bold, is_bold),
    is_italic = COALESCE(new_is_italic, is_italic),
    is_underline = COALESCE(new_is_underline, is_underline),
    is_section_header = COALESCE(new_is_section_header, is_section_header),
    updated_at = now()
  WHERE id = item_id;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now()
  WHERE id = token_record.id;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.duplicate_dj_mc_item_by_token(share_token text, item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  token_record RECORD;
  source_item RECORD;
  new_row RECORD;
BEGIN
  SELECT st.*, q.id as q_id
  INTO token_record
  FROM dj_mc_share_tokens st
  JOIN dj_mc_questionnaires q ON q.id = st.questionnaire_id
  WHERE (st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '==')
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT i.* INTO source_item
  FROM dj_mc_items i
  JOIN dj_mc_sections s ON s.id = i.section_id
  WHERE i.id = item_id AND s.questionnaire_id = token_record.q_id;

  IF source_item IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO dj_mc_items (section_id, row_label, value_text, music_url, song_title_artist, pronunciation_audio_url, duration, order_index, is_default, is_bold, is_italic, is_underline, is_section_header)
  VALUES (source_item.section_id, source_item.row_label, source_item.value_text, source_item.music_url, source_item.song_title_artist, source_item.pronunciation_audio_url, source_item.duration, source_item.order_index + 1, false, source_item.is_bold, source_item.is_italic, source_item.is_underline, source_item.is_section_header)
  RETURNING * INTO new_row;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;

  RETURN jsonb_build_object(
    'id', new_row.id,
    'section_id', new_row.section_id,
    'row_label', new_row.row_label,
    'value_text', new_row.value_text,
    'music_url', new_row.music_url,
    'song_title_artist', new_row.song_title_artist,
    'pronunciation_audio_url', new_row.pronunciation_audio_url,
    'duration', new_row.duration,
    'order_index', new_row.order_index,
    'is_default', new_row.is_default,
    'is_bold', new_row.is_bold,
    'is_italic', new_row.is_italic,
    'is_underline', new_row.is_underline,
    'is_section_header', new_row.is_section_header,
    'created_at', new_row.created_at,
    'updated_at', new_row.updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dj_mc_questionnaire_by_token(share_token text)
 RETURNS TABLE(questionnaire_id uuid, event_id uuid, event_name text, event_date date, event_venue text, start_time time without time zone, finish_time time without time zone, ceremony_date date, ceremony_venue text, ceremony_start_time time without time zone, ceremony_finish_time time without time zone, permission text, sections jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                'is_default', i.is_default,
                'is_bold', i.is_bold,
                'is_italic', i.is_italic,
                'is_underline', i.is_underline,
                'is_section_header', i.is_section_header
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
$function$;
