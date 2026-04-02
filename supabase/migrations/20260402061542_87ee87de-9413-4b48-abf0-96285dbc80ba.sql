-- =====================================================
-- DJ-MC Questionnaire: Token-secured RPC functions
-- Full feature parity for public shared links
-- =====================================================

-- 1. DROP + RECREATE update_dj_mc_item_by_token with extended params
DROP FUNCTION IF EXISTS public.update_dj_mc_item_by_token(text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.update_dj_mc_item_by_token(
  share_token text,
  item_id uuid,
  new_value_text text DEFAULT NULL,
  new_music_url text DEFAULT NULL,
  new_row_label text DEFAULT NULL,
  new_song_title_artist text DEFAULT NULL,
  new_duration text DEFAULT NULL,
  new_pronunciation_audio_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    updated_at = now()
  WHERE id = item_id;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now()
  WHERE id = token_record.id;

  RETURN TRUE;
END;
$$;

-- 2. add_dj_mc_item_by_token
CREATE OR REPLACE FUNCTION public.add_dj_mc_item_by_token(
  share_token text,
  p_section_id uuid,
  p_row_label text DEFAULT 'New Item',
  at_order_index integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
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

  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_sections WHERE id = p_section_id AND questionnaire_id = token_record.q_id
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO dj_mc_items (section_id, row_label, order_index, is_default)
  VALUES (p_section_id, p_row_label, at_order_index, false)
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
    'created_at', new_row.created_at,
    'updated_at', new_row.updated_at
  );
END;
$$;

-- 3. delete_dj_mc_item_by_token
CREATE OR REPLACE FUNCTION public.delete_dj_mc_item_by_token(
  share_token text,
  item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
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

  DELETE FROM dj_mc_items
  WHERE id = item_id
    AND section_id IN (SELECT id FROM dj_mc_sections WHERE questionnaire_id = token_record.q_id);

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;

-- 4. duplicate_dj_mc_item_by_token
CREATE OR REPLACE FUNCTION public.duplicate_dj_mc_item_by_token(
  share_token text,
  item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO dj_mc_items (section_id, row_label, value_text, music_url, song_title_artist, pronunciation_audio_url, duration, order_index, is_default)
  VALUES (source_item.section_id, source_item.row_label, source_item.value_text, source_item.music_url, source_item.song_title_artist, source_item.pronunciation_audio_url, source_item.duration, source_item.order_index + 1, false)
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
    'created_at', new_row.created_at,
    'updated_at', new_row.updated_at
  );
END;
$$;

-- 5. reorder_dj_mc_items_by_token
CREATE OR REPLACE FUNCTION public.reorder_dj_mc_items_by_token(
  share_token text,
  p_section_id uuid,
  item_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
  i integer;
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

  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_sections WHERE id = p_section_id AND questionnaire_id = token_record.q_id
  ) THEN
    RETURN FALSE;
  END IF;

  FOR i IN 1..array_length(item_ids, 1) LOOP
    UPDATE dj_mc_items
    SET order_index = i - 1, updated_at = now()
    WHERE id = item_ids[i] AND section_id = p_section_id;
  END LOOP;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;

-- 6. update_dj_mc_section_by_token
CREATE OR REPLACE FUNCTION public.update_dj_mc_section_by_token(
  share_token text,
  p_section_id uuid,
  new_section_label text DEFAULT NULL,
  new_notes text DEFAULT NULL,
  new_is_collapsed boolean DEFAULT NULL,
  clear_notes boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
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

  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_sections WHERE id = p_section_id AND questionnaire_id = token_record.q_id
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE dj_mc_sections
  SET
    section_label = COALESCE(new_section_label, section_label),
    notes = CASE WHEN clear_notes THEN NULL ELSE COALESCE(new_notes, notes) END,
    is_collapsed = COALESCE(new_is_collapsed, is_collapsed),
    updated_at = now()
  WHERE id = p_section_id;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;

-- 7. clear_dj_mc_section_items_by_token (clears content, keeps rows)
CREATE OR REPLACE FUNCTION public.clear_dj_mc_section_items_by_token(
  share_token text,
  p_section_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
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

  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_sections WHERE id = p_section_id AND questionnaire_id = token_record.q_id
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE dj_mc_items
  SET value_text = NULL, song_title_artist = NULL, music_url = NULL, duration = NULL, pronunciation_audio_url = NULL, updated_at = now()
  WHERE section_id = p_section_id;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;

-- 8. delete_dj_mc_section_by_token
CREATE OR REPLACE FUNCTION public.delete_dj_mc_section_by_token(
  share_token text,
  p_section_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
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

  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_sections WHERE id = p_section_id AND questionnaire_id = token_record.q_id
  ) THEN
    RETURN FALSE;
  END IF;

  DELETE FROM dj_mc_items WHERE section_id = p_section_id;
  DELETE FROM dj_mc_sections WHERE id = p_section_id;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;

-- 9. duplicate_dj_mc_section_by_token
CREATE OR REPLACE FUNCTION public.duplicate_dj_mc_section_by_token(
  share_token text,
  p_section_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
  source_section RECORD;
  new_section RECORD;
  new_items jsonb;
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

  SELECT * INTO source_section
  FROM dj_mc_sections
  WHERE id = p_section_id AND questionnaire_id = token_record.q_id;

  IF source_section IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE dj_mc_sections
  SET order_index = order_index + 1
  WHERE questionnaire_id = token_record.q_id AND order_index > source_section.order_index;

  INSERT INTO dj_mc_sections (questionnaire_id, section_type, section_label, order_index, notes, is_collapsed)
  VALUES (token_record.q_id, source_section.section_type, source_section.section_label || ' (Copy)', source_section.order_index + 1, source_section.notes, false)
  RETURNING * INTO new_section;

  INSERT INTO dj_mc_items (section_id, row_label, value_text, music_url, song_title_artist, pronunciation_audio_url, duration, order_index, is_default)
  SELECT new_section.id, row_label, value_text, music_url, song_title_artist, pronunciation_audio_url, duration, order_index, false
  FROM dj_mc_items
  WHERE section_id = p_section_id
  ORDER BY order_index;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'section_id', i.section_id,
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
  INTO new_items
  FROM dj_mc_items i
  WHERE i.section_id = new_section.id;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;

  RETURN jsonb_build_object(
    'id', new_section.id,
    'questionnaire_id', new_section.questionnaire_id,
    'section_type', new_section.section_type,
    'section_label', new_section.section_label,
    'order_index', new_section.order_index,
    'notes', new_section.notes,
    'is_collapsed', new_section.is_collapsed,
    'items', new_items
  );
END;
$$;

-- 10. reset_dj_mc_section_by_token (resets to default template)
CREATE OR REPLACE FUNCTION public.reset_dj_mc_section_by_token(
  share_token text,
  p_section_id uuid,
  p_default_label text,
  p_default_items jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
  item_obj jsonb;
  idx integer := 0;
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

  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_sections WHERE id = p_section_id AND questionnaire_id = token_record.q_id
  ) THEN
    RETURN FALSE;
  END IF;

  DELETE FROM dj_mc_items WHERE section_id = p_section_id;

  UPDATE dj_mc_sections SET section_label = p_default_label, notes = NULL, updated_at = now() WHERE id = p_section_id;

  FOR item_obj IN SELECT * FROM jsonb_array_elements(p_default_items)
  LOOP
    INSERT INTO dj_mc_items (section_id, row_label, order_index, is_default)
    VALUES (p_section_id, item_obj->>'row_label', idx, true);
    idx := idx + 1;
  END LOOP;

  UPDATE dj_mc_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;