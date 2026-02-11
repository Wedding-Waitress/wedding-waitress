
-- Step 1: Add encrypted columns for sensitive credentials
ALTER TABLE public.notification_settings 
  ADD COLUMN IF NOT EXISTS resend_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token_encrypted TEXT;

-- Step 2: Create a function to store notification settings with encryption
-- This uses pgcrypto's crypt() for the sensitive fields
-- We'll use a server-side encryption key stored as a DB setting
CREATE OR REPLACE FUNCTION public.upsert_notification_settings(
  _user_id UUID,
  _resend_api_key TEXT DEFAULT NULL,
  _from_email TEXT DEFAULT NULL,
  _email_enabled BOOLEAN DEFAULT FALSE,
  _sms_provider TEXT DEFAULT NULL,
  _twilio_account_sid TEXT DEFAULT NULL,
  _twilio_auth_token TEXT DEFAULT NULL,
  _twilio_messaging_service_sid TEXT DEFAULT NULL,
  _sms_enabled BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result RECORD;
  _enc_key TEXT;
BEGIN
  -- Only allow users to manage their own settings
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Use a deterministic encryption key derived from service role
  _enc_key := encode(extensions.digest(current_setting('app.settings.jwt_secret', true), 'sha256'), 'hex');
  
  -- If encryption key not available, fall back to a fixed internal key
  IF _enc_key IS NULL OR _enc_key = '' THEN
    _enc_key := 'ww_internal_enc_key_v1';
  END IF;

  INSERT INTO public.notification_settings (
    user_id, from_email, email_enabled, sms_provider,
    twilio_account_sid, twilio_messaging_service_sid, sms_enabled,
    resend_api_key, twilio_auth_token,
    resend_api_key_encrypted, twilio_auth_token_encrypted,
    updated_at
  ) VALUES (
    _user_id, _from_email, _email_enabled, _sms_provider,
    _twilio_account_sid, _twilio_messaging_service_sid, _sms_enabled,
    NULL, NULL,
    CASE WHEN _resend_api_key IS NOT NULL AND _resend_api_key != '' 
      THEN extensions.pgp_sym_encrypt(_resend_api_key, _enc_key) 
      ELSE NULL END,
    CASE WHEN _twilio_auth_token IS NOT NULL AND _twilio_auth_token != '' 
      THEN extensions.pgp_sym_encrypt(_twilio_auth_token, _enc_key) 
      ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    from_email = EXCLUDED.from_email,
    email_enabled = EXCLUDED.email_enabled,
    sms_provider = EXCLUDED.sms_provider,
    twilio_account_sid = EXCLUDED.twilio_account_sid,
    twilio_messaging_service_sid = EXCLUDED.twilio_messaging_service_sid,
    sms_enabled = EXCLUDED.sms_enabled,
    resend_api_key = NULL,
    twilio_auth_token = NULL,
    resend_api_key_encrypted = EXCLUDED.resend_api_key_encrypted,
    twilio_auth_token_encrypted = EXCLUDED.twilio_auth_token_encrypted,
    updated_at = now()
  RETURNING * INTO _result;

  -- Return non-sensitive fields plus masked versions
  RETURN jsonb_build_object(
    'id', _result.id,
    'user_id', _result.user_id,
    'from_email', _result.from_email,
    'email_enabled', _result.email_enabled,
    'sms_provider', _result.sms_provider,
    'twilio_account_sid', _result.twilio_account_sid,
    'twilio_messaging_service_sid', _result.twilio_messaging_service_sid,
    'sms_enabled', _result.sms_enabled,
    'resend_api_key', CASE WHEN _resend_api_key IS NOT NULL AND _resend_api_key != '' THEN '••••' || right(_resend_api_key, 4) ELSE NULL END,
    'twilio_auth_token', CASE WHEN _twilio_auth_token IS NOT NULL AND _twilio_auth_token != '' THEN '••••' || right(_twilio_auth_token, 4) ELSE NULL END,
    'updated_at', _result.updated_at
  );
END;
$$;

-- Step 3: Create a function to read settings with decrypted values (owner only)
CREATE OR REPLACE FUNCTION public.get_notification_settings(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result RECORD;
  _enc_key TEXT;
  _decrypted_resend TEXT;
  _decrypted_twilio TEXT;
BEGIN
  -- Only allow users to read their own settings
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO _result
  FROM public.notification_settings
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  _enc_key := encode(extensions.digest(current_setting('app.settings.jwt_secret', true), 'sha256'), 'hex');
  IF _enc_key IS NULL OR _enc_key = '' THEN
    _enc_key := 'ww_internal_enc_key_v1';
  END IF;

  -- Decrypt sensitive fields
  BEGIN
    IF _result.resend_api_key_encrypted IS NOT NULL THEN
      _decrypted_resend := extensions.pgp_sym_decrypt(_result.resend_api_key_encrypted::bytea, _enc_key);
    ELSE
      _decrypted_resend := _result.resend_api_key;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _decrypted_resend := _result.resend_api_key;
  END;

  BEGIN
    IF _result.twilio_auth_token_encrypted IS NOT NULL THEN
      _decrypted_twilio := extensions.pgp_sym_decrypt(_result.twilio_auth_token_encrypted::bytea, _enc_key);
    ELSE
      _decrypted_twilio := _result.twilio_auth_token;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _decrypted_twilio := _result.twilio_auth_token;
  END;

  RETURN jsonb_build_object(
    'id', _result.id,
    'user_id', _result.user_id,
    'from_email', _result.from_email,
    'email_enabled', _result.email_enabled,
    'sms_provider', _result.sms_provider,
    'twilio_account_sid', _result.twilio_account_sid,
    'twilio_auth_token', _decrypted_twilio,
    'twilio_messaging_service_sid', _result.twilio_messaging_service_sid,
    'sms_enabled', _result.sms_enabled,
    'resend_api_key', _decrypted_resend,
    'updated_at', _result.updated_at
  );
END;
$$;

-- Add unique constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_settings_user_id_key'
  ) THEN
    ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;
