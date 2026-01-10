-- Fix the token generation function to use schema-qualified pgcrypto function
CREATE OR REPLACE FUNCTION public.generate_dj_mc_share_token(
  _questionnaire_id uuid,
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
  -- Verify the user owns this questionnaire
  IF NOT EXISTS (
    SELECT 1 FROM dj_mc_questionnaires
    WHERE id = _questionnaire_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to questionnaire';
  END IF;

  -- Generate secure random token using schema-qualified name
  _token := encode(extensions.gen_random_bytes(32), 'base64');
  _token := replace(replace(_token, '/', '_'), '+', '-');
  
  -- Calculate expiry
  _expires_at := now() + (_validity_days || ' days')::interval;

  -- Insert the token
  INSERT INTO dj_mc_share_tokens (
    questionnaire_id,
    token,
    permission,
    recipient_name,
    expires_at
  ) VALUES (
    _questionnaire_id,
    _token,
    _permission,
    _recipient_name,
    _expires_at
  );

  RETURN _token;
END;
$$;