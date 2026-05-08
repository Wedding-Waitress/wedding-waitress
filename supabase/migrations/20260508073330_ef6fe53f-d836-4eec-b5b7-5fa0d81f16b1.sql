
-- =========================================================
-- Smart RSVP & Messaging - SMS credit system
-- =========================================================

-- 1. Pricing constants (singleton)
CREATE TABLE IF NOT EXISTS public.sms_pricing_constants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  included_credits integer NOT NULL DEFAULT 250,
  topup_credits integer NOT NULL DEFAULT 250,
  topup_price_aud numeric(10,2) NOT NULL DEFAULT 99,
  gst_rate numeric(5,4) NOT NULL DEFAULT 0.10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.sms_pricing_constants (included_credits, topup_credits, topup_price_aud, gst_rate)
SELECT 250, 250, 99, 0.10
WHERE NOT EXISTS (SELECT 1 FROM public.sms_pricing_constants);

ALTER TABLE public.sms_pricing_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sms pricing"
ON public.sms_pricing_constants FOR SELECT
USING (true);

CREATE POLICY "Admins can manage sms pricing"
ON public.sms_pricing_constants FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. SMS credits per (user, event)
CREATE TABLE IF NOT EXISTS public.sms_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  total integer NOT NULL DEFAULT 0,
  used integer NOT NULL DEFAULT 0,
  remaining integer GENERATED ALWAYS AS (total - used) STORED,
  last_topup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id),
  CHECK (used >= 0),
  CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sms_credits_user_event ON public.sms_credits(user_id, event_id);

ALTER TABLE public.sms_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sms credits"
ON public.sms_credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sms credits"
ON public.sms_credits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- No direct INSERT/UPDATE/DELETE policies — all writes via SECURITY DEFINER RPCs.

-- 3. SMS send logs (audit)
CREATE TABLE IF NOT EXISTS public.sms_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  guest_id uuid,
  to_masked text,
  twilio_sid text,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('sent','failed','blocked'))
);

CREATE INDEX IF NOT EXISTS idx_sms_send_logs_user_event ON public.sms_send_logs(user_id, event_id, created_at DESC);

ALTER TABLE public.sms_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sms logs"
ON public.sms_send_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sms logs"
ON public.sms_send_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 4. RPCs

-- get_sms_credits: returns total/used/remaining (creates row if missing? NO — return zeros)
CREATE OR REPLACE FUNCTION public.get_sms_credits(_user_id uuid, _event_id uuid)
RETURNS TABLE(total integer, used integer, remaining integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(c.total, 0)::int AS total,
    COALESCE(c.used, 0)::int AS used,
    COALESCE(c.remaining, 0)::int AS remaining
  FROM (SELECT 1) dummy
  LEFT JOIN public.sms_credits c ON c.user_id = _user_id AND c.event_id = _event_id;
$$;

-- add_sms_credits: idempotent upsert + increment
CREATE OR REPLACE FUNCTION public.add_sms_credits(
  _user_id uuid,
  _event_id uuid,
  _amount integer,
  _source text DEFAULT 'topup'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.sms_credits;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.sms_credits (user_id, event_id, total, used, last_topup_at)
  VALUES (_user_id, _event_id, _amount, 0, now())
  ON CONFLICT (user_id, event_id)
  DO UPDATE SET
    total = public.sms_credits.total + EXCLUDED.total,
    last_topup_at = now(),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN jsonb_build_object(
    'total', _row.total,
    'used', _row.used,
    'remaining', _row.remaining,
    'source', _source
  );
END;
$$;

-- consume_sms_credit: atomic decrement; returns true on success
CREATE OR REPLACE FUNCTION public.consume_sms_credit(
  _user_id uuid,
  _event_id uuid,
  _guest_id uuid,
  _twilio_sid text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  UPDATE public.sms_credits
  SET used = used + 1, updated_at = now()
  WHERE user_id = _user_id
    AND event_id = _event_id
    AND (total - used) > 0;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

-- log_sms_send: write audit log entry
CREATE OR REPLACE FUNCTION public.log_sms_send(
  _user_id uuid,
  _event_id uuid,
  _guest_id uuid,
  _to_masked text,
  _twilio_sid text,
  _status text,
  _error text DEFAULT NULL
)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.sms_send_logs (user_id, event_id, guest_id, to_masked, twilio_sid, status, error_message)
  VALUES (_user_id, _event_id, _guest_id, _to_masked, _twilio_sid, _status, _error);
$$;

-- 5. Backfill 250 credits for existing Smart RSVP purchases
INSERT INTO public.sms_credits (user_id, event_id, total, used, last_topup_at)
SELECT DISTINCT ON (p.user_id, p.event_id)
  p.user_id,
  p.event_id,
  250,
  0,
  p.created_at
FROM public.rsvp_invite_purchases p
WHERE p.status = 'completed'
  AND (p.purchase_type = 'rsvp_tier' OR p.purchase_type IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.sms_credits c
    WHERE c.user_id = p.user_id AND c.event_id = p.event_id
  )
ORDER BY p.user_id, p.event_id, p.created_at ASC;
