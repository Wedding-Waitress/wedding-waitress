
CREATE OR REPLACE FUNCTION public.update_running_sheet_item_by_token(
  share_token text,
  item_id uuid,
  new_time_text text DEFAULT NULL,
  new_description_rich jsonb DEFAULT NULL,
  new_responsible text DEFAULT NULL
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
  -- Validate token and check permission
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

  -- Verify item belongs to this sheet
  SELECT i.* INTO item_record
  FROM running_sheet_items i
  WHERE i.id = item_id AND i.sheet_id = token_record.rs_id;

  IF item_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update the item
  UPDATE running_sheet_items
  SET
    time_text = COALESCE(new_time_text, time_text),
    description_rich = COALESCE(new_description_rich, description_rich),
    responsible = COALESCE(new_responsible, responsible),
    updated_at = now()
  WHERE id = item_id;

  -- Update last accessed
  UPDATE running_sheet_share_tokens SET last_accessed_at = now()
  WHERE id = token_record.id;

  RETURN TRUE;
END;
$$;
