-- Plan-included shared RSVP email/SMS credits and current package catalogue.
-- Existing credit balances are preserved; new plan allowances only raise totals.

UPDATE public.subscription_plans
SET guest_limit = 400
WHERE id = 'cd10f207-2109-4546-a635-0baa68ba8213'::uuid;

UPDATE public.subscription_plans
SET is_active = false
WHERE id = '632b476a-39da-4f6f-8457-9ba104d571da'::uuid;

CREATE OR REPLACE FUNCTION public.get_sms_credits(_user_id uuid, _event_id uuid)
RETURNS TABLE(total integer, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _allowance integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id
     AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'event not found or not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT CASE us.plan_id
    WHEN '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid THEN 150
    WHEN '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid THEN 250
    WHEN 'cd10f207-2109-4546-a635-0baa68ba8213'::uuid THEN 450
    ELSE 0
  END INTO _allowance
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id
    AND us.status IN ('active', 'trialing', 'grace_period')
  LIMIT 1;

  _allowance := coalesce(_allowance, 0);
  INSERT INTO public.sms_credits (user_id, event_id, total, used)
  VALUES (_user_id, _event_id, _allowance, 0)
  ON CONFLICT (user_id, event_id) DO UPDATE
    SET total = greatest(public.sms_credits.total, _allowance), updated_at = now();

  RETURN QUERY
  SELECT c.total, c.used, c.remaining
  FROM public.sms_credits c
  WHERE c.user_id = _user_id AND c.event_id = _event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sms_credits(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sms_credits(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_communication_credit(
  _user_id uuid, _event_id uuid, _guest_id uuid, _channel text, _delivery_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE _updated integer;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF _channel NOT IN ('email', 'sms') THEN RAISE EXCEPTION 'invalid channel'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.user_id = _user_id) THEN
    RAISE EXCEPTION 'event not found or not authorised' USING ERRCODE = '42501';
  END IF;
  UPDATE public.sms_credits SET used = used + 1, updated_at = now()
  WHERE user_id = _user_id AND event_id = _event_id AND remaining > 0;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_communication_credit(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_communication_credit(uuid, uuid, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.restore_communication_credit(_user_id uuid, _event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.sms_credits SET used = greatest(used - 1, 0), updated_at = now()
  WHERE user_id = _user_id AND event_id = _event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_communication_credit(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_communication_credit(uuid, uuid) TO service_role;

-- Close legacy mutation RPCs that previously inherited PostgreSQL's PUBLIC
-- execute privilege. Edge Functions continue to use them via service_role.
REVOKE ALL ON FUNCTION public.add_sms_credits(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_sms_credits(uuid, uuid, integer, text) TO service_role;
REVOKE ALL ON FUNCTION public.consume_sms_credit(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_sms_credit(uuid, uuid, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.log_sms_send(uuid, uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_sms_send(uuid, uuid, uuid, text, text, text, text, text) TO service_role;

UPDATE public.sms_pricing_constants
SET topup_credits = 100, topup_price_aud = 49, updated_at = now()
WHERE is_active = true;

COMMENT ON TABLE public.sms_credits IS
  'Legacy table name; authoritative shared RSVP email and SMS communication-credit balance per event.';
