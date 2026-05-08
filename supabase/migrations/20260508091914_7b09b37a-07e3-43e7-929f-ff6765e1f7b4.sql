
ALTER TABLE public.rsvp_invite_purchases
  ADD COLUMN IF NOT EXISTS delivery_method text;

ALTER TABLE public.rsvp_invite_purchases
  DROP CONSTRAINT IF EXISTS rsvp_invite_purchases_delivery_method_check;
ALTER TABLE public.rsvp_invite_purchases
  ADD CONSTRAINT rsvp_invite_purchases_delivery_method_check
  CHECK (delivery_method IS NULL OR delivery_method IN ('email','sms','both'));

CREATE INDEX IF NOT EXISTS idx_rsvp_invite_purchases_event_method
  ON public.rsvp_invite_purchases(event_id, delivery_method);

ALTER TABLE public.sms_send_logs
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'sms';

ALTER TABLE public.sms_send_logs
  DROP CONSTRAINT IF EXISTS sms_send_logs_delivery_method_check;
ALTER TABLE public.sms_send_logs
  ADD CONSTRAINT sms_send_logs_delivery_method_check
  CHECK (delivery_method IN ('email','sms','both'));

DROP FUNCTION IF EXISTS public.log_sms_send(uuid,uuid,uuid,text,text,text,text);

CREATE OR REPLACE FUNCTION public.log_sms_send(
  _user_id uuid,
  _event_id uuid,
  _guest_id uuid,
  _to_masked text,
  _twilio_sid text,
  _status text,
  _error text DEFAULT NULL,
  _delivery_method text DEFAULT 'sms'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.sms_send_logs
    (user_id, event_id, guest_id, to_masked, twilio_sid, status, error_message,
     last_status_at, delivery_method)
  VALUES
    (_user_id, _event_id, _guest_id, _to_masked, _twilio_sid,
     _status::public.sms_delivery_status, _error, now(),
     COALESCE(NULLIF(_delivery_method, ''), 'sms'))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_messaging_analytics(_event_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'delivery_method', (
      SELECT delivery_method
      FROM public.rsvp_invite_purchases
      WHERE event_id = _event_id
        AND status = 'completed'
        AND (purchase_type = 'rsvp_tier' OR purchase_type IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    ),
    'sms_credits_total',     COALESCE((SELECT total FROM public.sms_credits WHERE event_id = _event_id LIMIT 1), 0),
    'sms_credits_used',      COALESCE((SELECT used  FROM public.sms_credits WHERE event_id = _event_id LIMIT 1), 0),
    'sms_credits_remaining', COALESCE((SELECT GREATEST(total - used, 0) FROM public.sms_credits WHERE event_id = _event_id LIMIT 1), 0),
    'sms_sent',              COALESCE((SELECT count(*) FROM public.sms_send_logs WHERE event_id = _event_id AND status IN ('sent','delivered')), 0),
    'emails_sent',           0,
    'guests_delivered',      COALESCE((SELECT count(DISTINCT guest_id) FROM public.sms_send_logs WHERE event_id = _event_id AND status = 'delivered' AND guest_id IS NOT NULL), 0),
    'guests_failed',         COALESCE((SELECT count(DISTINCT guest_id) FROM public.sms_send_logs WHERE event_id = _event_id AND status IN ('failed','undelivered') AND guest_id IS NOT NULL), 0),
    'guests_responded',      COALESCE((SELECT count(*) FROM public.guests WHERE event_id = _event_id AND rsvp IN ('Attending','Not Attending')), 0)
  );
$$;
