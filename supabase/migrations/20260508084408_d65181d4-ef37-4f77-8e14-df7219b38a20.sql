
DO $$ BEGIN
  CREATE TYPE public.sms_delivery_status AS ENUM ('queued','sent','delivered','undelivered','failed','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sms_send_logs
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS error_code text;

ALTER TABLE public.sms_send_logs DROP CONSTRAINT IF EXISTS sms_send_logs_status_check;
ALTER TABLE public.sms_send_logs
  ALTER COLUMN status TYPE public.sms_delivery_status
  USING status::public.sms_delivery_status;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_send_logs_twilio_sid
  ON public.sms_send_logs(twilio_sid) WHERE twilio_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_send_logs_event_last_status
  ON public.sms_send_logs(event_id, last_status_at DESC);

DROP FUNCTION IF EXISTS public.log_sms_send(uuid,uuid,uuid,text,text,text,text);

CREATE OR REPLACE FUNCTION public.log_sms_send(
  _user_id uuid,
  _event_id uuid,
  _guest_id uuid,
  _to_masked text,
  _twilio_sid text,
  _status text,
  _error text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.sms_send_logs
    (user_id, event_id, guest_id, to_masked, twilio_sid, status, error_message, last_status_at)
  VALUES
    (_user_id, _event_id, _guest_id, _to_masked, _twilio_sid,
     _status::public.sms_delivery_status, _error, now())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sms_log_status(
  _id uuid,
  _status text,
  _twilio_sid text DEFAULT NULL,
  _error text DEFAULT NULL,
  _error_code text DEFAULT NULL
)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.sms_send_logs
  SET status = _status::public.sms_delivery_status,
      twilio_sid = COALESCE(_twilio_sid, twilio_sid),
      error_message = COALESCE(_error, error_message),
      error_code = COALESCE(_error_code, error_code),
      last_status_at = now(),
      delivered_at = CASE WHEN _status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.update_sms_delivery_status(
  _twilio_sid text,
  _status text,
  _error_code text DEFAULT NULL,
  _error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  UPDATE public.sms_send_logs
  SET status = _status::public.sms_delivery_status,
      error_code = COALESCE(_error_code, error_code),
      error_message = COALESCE(_error, error_message),
      last_status_at = now(),
      delivered_at = CASE WHEN _status = 'delivered' THEN now() ELSE delivered_at END
  WHERE twilio_sid = _twilio_sid;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;
