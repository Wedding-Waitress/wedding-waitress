
ALTER TABLE public.sms_send_logs
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS twilio_error_code text,
  ADD COLUMN IF NOT EXISTS twilio_error_message text,
  ADD COLUMN IF NOT EXISTS raw_twilio_status text,
  ADD COLUMN IF NOT EXISTS webhook_payload jsonb;

CREATE INDEX IF NOT EXISTS idx_sms_send_logs_guest_id ON public.sms_send_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_sms_send_logs_event_id ON public.sms_send_logs(event_id);

-- Drop older signature(s) to allow extension
DROP FUNCTION IF EXISTS public.update_sms_delivery_status(text, text, text, text);
DROP FUNCTION IF EXISTS public.update_sms_delivery_status(text, text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.update_sms_delivery_status(
  _twilio_sid text,
  _status text,
  _error_code text DEFAULT NULL,
  _error_message text DEFAULT NULL,
  _raw_status text DEFAULT NULL,
  _payload jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  IF _twilio_sid IS NULL OR _twilio_sid = '' THEN
    RETURN false;
  END IF;

  UPDATE public.sms_send_logs
  SET status = _status::public.sms_delivery_status,
      error_code = COALESCE(_error_code, error_code),
      error_message = COALESCE(_error_message, error_message),
      twilio_error_code = COALESCE(_error_code, twilio_error_code),
      twilio_error_message = COALESCE(_error_message, twilio_error_message),
      raw_twilio_status = COALESCE(_raw_status, raw_twilio_status),
      webhook_payload = COALESCE(_payload, webhook_payload),
      last_status_at = now(),
      delivered_at = CASE WHEN _status = 'delivered' THEN now() ELSE delivered_at END,
      failed_at = CASE WHEN _status IN ('failed','undelivered','blocked') THEN now() ELSE failed_at END
  WHERE twilio_sid = _twilio_sid;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;
