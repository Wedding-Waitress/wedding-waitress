
-- 1. Extend update_running_sheet_item_by_token with formatting params
CREATE OR REPLACE FUNCTION public.update_running_sheet_item_by_token(
  share_token text,
  item_id uuid,
  new_time_text text DEFAULT NULL,
  new_description_rich jsonb DEFAULT NULL,
  new_responsible text DEFAULT NULL,
  new_is_section_header boolean DEFAULT NULL,
  new_is_bold boolean DEFAULT NULL,
  new_is_italic boolean DEFAULT NULL,
  new_is_underline boolean DEFAULT NULL
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
  SELECT st.*, rs.id as rs_id
  INTO token_record
  FROM running_sheet_share_tokens st
  JOIN running_sheets rs ON rs.id = st.sheet_id
  WHERE (st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '==')
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT i.* INTO item_record
  FROM running_sheet_items i
  WHERE i.id = item_id AND i.sheet_id = token_record.rs_id;

  IF item_record IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE running_sheet_items
  SET
    time_text = COALESCE(new_time_text, time_text),
    description_rich = COALESCE(new_description_rich, description_rich),
    responsible = COALESCE(new_responsible, responsible),
    is_section_header = COALESCE(new_is_section_header, is_section_header),
    is_bold = COALESCE(new_is_bold, is_bold),
    is_italic = COALESCE(new_is_italic, is_italic),
    is_underline = COALESCE(new_is_underline, is_underline),
    updated_at = now()
  WHERE id = item_id;

  UPDATE running_sheet_share_tokens SET last_accessed_at = now()
  WHERE id = token_record.id;

  RETURN TRUE;
END;
$$;

-- 2. Add row by token
CREATE OR REPLACE FUNCTION public.add_running_sheet_item_by_token(
  share_token text,
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
  SELECT st.*, rs.id as rs_id
  INTO token_record
  FROM running_sheet_share_tokens st
  JOIN running_sheets rs ON rs.id = st.sheet_id
  WHERE (st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '==')
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO running_sheet_items (sheet_id, order_index, time_text, description_rich, responsible, is_section_header)
  VALUES (token_record.rs_id, at_order_index, '', '{"text":""}'::jsonb, '', false)
  RETURNING * INTO new_row;

  UPDATE running_sheet_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;

  RETURN jsonb_build_object(
    'id', new_row.id,
    'sheet_id', new_row.sheet_id,
    'order_index', new_row.order_index,
    'time_text', new_row.time_text,
    'description_rich', new_row.description_rich,
    'responsible', new_row.responsible,
    'is_section_header', new_row.is_section_header,
    'is_bold', COALESCE(new_row.is_bold, false),
    'is_italic', COALESCE(new_row.is_italic, false),
    'is_underline', COALESCE(new_row.is_underline, false),
    'created_at', new_row.created_at,
    'updated_at', new_row.updated_at
  );
END;
$$;

-- 3. Delete row by token
CREATE OR REPLACE FUNCTION public.delete_running_sheet_item_by_token(
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
  SELECT st.*, rs.id as rs_id
  INTO token_record
  FROM running_sheet_share_tokens st
  JOIN running_sheets rs ON rs.id = st.sheet_id
  WHERE (st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '==')
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN FALSE;
  END IF;

  DELETE FROM running_sheet_items
  WHERE id = item_id AND sheet_id = token_record.rs_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE running_sheet_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;

-- 4. Duplicate row by token
CREATE OR REPLACE FUNCTION public.duplicate_running_sheet_item_by_token(
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
  SELECT st.*, rs.id as rs_id
  INTO token_record
  FROM running_sheet_share_tokens st
  JOIN running_sheets rs ON rs.id = st.sheet_id
  WHERE (st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '==')
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO source_item
  FROM running_sheet_items
  WHERE id = item_id AND sheet_id = token_record.rs_id;

  IF source_item IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO running_sheet_items (sheet_id, order_index, time_text, description_rich, responsible, is_section_header, is_bold, is_italic, is_underline)
  VALUES (source_item.sheet_id, source_item.order_index + 1, source_item.time_text, source_item.description_rich, source_item.responsible, source_item.is_section_header, source_item.is_bold, source_item.is_italic, source_item.is_underline)
  RETURNING * INTO new_row;

  UPDATE running_sheet_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;

  RETURN jsonb_build_object(
    'id', new_row.id,
    'sheet_id', new_row.sheet_id,
    'order_index', new_row.order_index,
    'time_text', new_row.time_text,
    'description_rich', new_row.description_rich,
    'responsible', new_row.responsible,
    'is_section_header', new_row.is_section_header,
    'is_bold', COALESCE(new_row.is_bold, false),
    'is_italic', COALESCE(new_row.is_italic, false),
    'is_underline', COALESCE(new_row.is_underline, false),
    'created_at', new_row.created_at,
    'updated_at', new_row.updated_at
  );
END;
$$;

-- 5. Reorder rows by token
CREATE OR REPLACE FUNCTION public.reorder_running_sheet_items_by_token(
  share_token text,
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
  SELECT st.*, rs.id as rs_id
  INTO token_record
  FROM running_sheet_share_tokens st
  JOIN running_sheets rs ON rs.id = st.sheet_id
  WHERE (st.token = share_token OR st.token = share_token || '=' OR st.token = share_token || '==')
    AND st.permission = 'can_edit'
    AND (st.expires_at IS NULL OR st.expires_at > now());

  IF token_record IS NULL THEN
    RETURN FALSE;
  END IF;

  FOR i IN 1..array_length(item_ids, 1) LOOP
    UPDATE running_sheet_items
    SET order_index = i - 1, updated_at = now()
    WHERE id = item_ids[i] AND sheet_id = token_record.rs_id;
  END LOOP;

  UPDATE running_sheet_share_tokens SET last_accessed_at = now() WHERE id = token_record.id;
  RETURN TRUE;
END;
$$;
