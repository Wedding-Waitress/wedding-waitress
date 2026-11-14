-- Keep the shared Email/SMS credit ledger authoritative for Platform Owner
-- sends and add a provider-call idempotency key for SMS invitations.

ALTER TABLE public.sms_send_logs
  ADD COLUMN IF NOT EXISTS delivery_id text;

CREATE UNIQUE INDEX IF NOT EXISTS sms_send_logs_delivery_id_key
  ON public.sms_send_logs(delivery_id)
  WHERE delivery_id IS NOT NULL;

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
     AND coalesce(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'event not found or not authorised' USING ERRCODE = '42501';
  END IF;

  IF private.is_platform_owner(_user_id)
     AND public.has_role(_user_id, 'admin'::public.app_role) THEN
    _allowance := 450;
  ELSE
    SELECT CASE us.plan_id
      WHEN '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid THEN 150
      WHEN '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid THEN 250
      WHEN 'cd10f207-2109-4546-a635-0baa68ba8213'::uuid THEN 450
      ELSE 0
    END INTO _allowance
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id
      AND us.status IN ('active', 'trialing', 'grace_period')
    ORDER BY us.created_at DESC
    LIMIT 1;
  END IF;

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

COMMENT ON COLUMN public.sms_send_logs.delivery_id IS
  'Client request/guest/channel idempotency key; prevents duplicate provider sends.';

-- PostgREST supplies request.jwt.claims as JSON. The old individual GUC is
-- empty, including for service-role requests, and caused both senders to fail.
CREATE OR REPLACE FUNCTION public.consume_communication_credit(
  _user_id uuid, _event_id uuid, _guest_id uuid, _channel text, _delivery_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE _updated integer;
BEGIN
  IF coalesce(auth.jwt()->>'role', '') <> 'service_role' THEN
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

CREATE OR REPLACE FUNCTION public.restore_communication_credit(_user_id uuid, _event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.sms_credits SET used = greatest(used - 1, 0), updated_at = now()
    WHERE user_id = _user_id AND event_id = _event_id;
END;
$$;

-- Merge against the locked/current row, not the sender's earlier snapshot.
-- Concurrent email and SMS acceptances must end at both_sent.
CREATE OR REPLACE FUNCTION public.record_rsvp_acceptance(_user_id uuid, _event_id uuid, _guest_id uuid, _channel text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF _channel NOT IN ('email', 'sms') THEN RAISE EXCEPTION 'invalid channel'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.user_id = _user_id) THEN
    RAISE EXCEPTION 'event not found or not authorised' USING ERRCODE = '42501';
  END IF;
  UPDATE public.guests SET rsvp_invite_status = CASE
    WHEN rsvp_invite_status = 'both_sent' THEN 'both_sent'
    WHEN _channel = 'email' AND rsvp_invite_status = 'sms_sent' THEN 'both_sent'
    WHEN _channel = 'sms' AND rsvp_invite_status = 'email_sent' THEN 'both_sent'
    ELSE _channel || '_sent' END, rsvp_invite_sent_at = now()
    WHERE id = _guest_id AND event_id = _event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'guest not found'; END IF;
  INSERT INTO public.rsvp_invite_logs(event_id, guest_id, user_id, channel, status)
    VALUES (_event_id, _guest_id, _user_id, _channel, 'sent');
END;
$$;

REVOKE ALL ON FUNCTION public.consume_communication_credit(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_communication_credit(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_rsvp_acceptance(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_communication_credit(uuid, uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_communication_credit(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_rsvp_acceptance(uuid, uuid, uuid, text) TO service_role;
