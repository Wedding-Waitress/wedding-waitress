
-- Table for seating chart share tokens
CREATE TABLE public.seating_chart_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  recipient_name TEXT,
  permission TEXT NOT NULL DEFAULT 'view_only',
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.seating_chart_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own seating chart share tokens"
  ON public.seating_chart_share_tokens FOR ALL
  USING (auth.uid() = user_id);

-- Token generation function
CREATE OR REPLACE FUNCTION public.generate_seating_chart_share_token(
  _event_id UUID,
  _permission TEXT DEFAULT 'view_only',
  _recipient_name TEXT DEFAULT NULL,
  _validity_days INTEGER DEFAULT 90
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _token TEXT;
  _expires_at TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = _event_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to event';
  END IF;

  _token := encode(extensions.gen_random_bytes(32), 'base64');
  _token := replace(replace(_token, '/', '_'), '+', '-');
  _token := rtrim(_token, '=');

  _expires_at := now() + (_validity_days || ' days')::interval;

  INSERT INTO seating_chart_share_tokens (event_id, user_id, token, permission, recipient_name, expires_at)
  VALUES (_event_id, auth.uid(), _token, _permission, _recipient_name, _expires_at);

  RETURN _token;
END;
$$;

-- Public data retrieval function
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
          'seat_no', g.seat_no,
          'dietary', g.dietary,
          'relation_display', g.relation_display,
          'rsvp', g.rsvp
        ) ORDER BY g.first_name, g.last_name
      ), '[]'::jsonb)
      FROM guests g
      WHERE g.event_id = token_record.e_id
    ) as guests;
END;
$$;
