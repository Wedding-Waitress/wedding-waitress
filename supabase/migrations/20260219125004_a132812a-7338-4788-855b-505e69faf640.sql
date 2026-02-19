
-- Create running_sheet_share_tokens table (mirrors dj_mc_share_tokens)
CREATE TABLE public.running_sheet_share_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id uuid NOT NULL REFERENCES public.running_sheets(id) ON DELETE CASCADE,
  token text NOT NULL,
  permission text NOT NULL DEFAULT 'view_only',
  recipient_name text,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.running_sheet_share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create share tokens for their sheets"
  ON public.running_sheet_share_tokens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.running_sheets rs WHERE rs.id = running_sheet_share_tokens.sheet_id AND rs.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own share tokens"
  ON public.running_sheet_share_tokens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.running_sheets rs WHERE rs.id = running_sheet_share_tokens.sheet_id AND rs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own share tokens"
  ON public.running_sheet_share_tokens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.running_sheets rs WHERE rs.id = running_sheet_share_tokens.sheet_id AND rs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own share tokens"
  ON public.running_sheet_share_tokens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.running_sheets rs WHERE rs.id = running_sheet_share_tokens.sheet_id AND rs.user_id = auth.uid()
  ));

-- RPC: generate_running_sheet_share_token
CREATE OR REPLACE FUNCTION public.generate_running_sheet_share_token(
  _sheet_id uuid,
  _permission text DEFAULT 'view_only',
  _recipient_name text DEFAULT NULL,
  _validity_days integer DEFAULT 90
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _token TEXT;
  _expires_at TIMESTAMPTZ;
BEGIN
  -- Verify user owns this sheet
  IF NOT EXISTS (
    SELECT 1 FROM running_sheets WHERE id = _sheet_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to running sheet';
  END IF;

  _token := encode(extensions.gen_random_bytes(32), 'base64');
  _token := replace(replace(_token, '/', '_'), '+', '-');
  _token := rtrim(_token, '=');

  _expires_at := now() + (_validity_days || ' days')::interval;

  INSERT INTO running_sheet_share_tokens (sheet_id, token, permission, recipient_name, expires_at)
  VALUES (_sheet_id, _token, _permission, _recipient_name, _expires_at);

  RETURN _token;
END;
$$;

-- RPC: get_running_sheet_by_token
CREATE OR REPLACE FUNCTION public.get_running_sheet_by_token(share_token text)
RETURNS TABLE(
  sheet_id uuid,
  event_id uuid,
  event_name text,
  event_date date,
  event_venue text,
  permission text,
  items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
