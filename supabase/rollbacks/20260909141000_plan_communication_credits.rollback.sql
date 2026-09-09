-- Roll back the plan-included shared Email/SMS credit catalogue.
-- This file is intentionally not applied as part of the forward release.
-- Existing credit rows and their usage history are preserved.

BEGIN;

UPDATE public.subscription_plans
SET guest_limit = 500
WHERE id = 'cd10f207-2109-4546-a635-0baa68ba8213'::uuid;

UPDATE public.subscription_plans
SET is_active = true
WHERE id = '632b476a-39da-4f6f-8457-9ba104d571da'::uuid;

CREATE OR REPLACE FUNCTION public.get_sms_credits(_user_id uuid, _event_id uuid)
RETURNS TABLE(total integer, used integer, remaining integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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

  RETURN QUERY
  SELECT
    coalesce(c.total, 0)::integer,
    coalesce(c.used, 0)::integer,
    coalesce(c.remaining, 0)::integer
  FROM (SELECT 1) AS singleton
  LEFT JOIN public.sms_credits c
    ON c.user_id = _user_id AND c.event_id = _event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sms_credits(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sms_credits(uuid, uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.consume_communication_credit(uuid, uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.restore_communication_credit(uuid, uuid);

UPDATE public.sms_pricing_constants
SET topup_credits = 250, topup_price_aud = 99, updated_at = now()
WHERE is_active = true;

COMMENT ON TABLE public.sms_credits IS
  'Per-event SMS credit balance and usage history.';

-- Keep the mutation RPC security hardening from the forward migration. A
-- rollback must not re-open credit mutation functions to browser roles.
REVOKE ALL ON FUNCTION public.add_sms_credits(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_sms_credits(uuid, uuid, integer, text) TO service_role;
REVOKE ALL ON FUNCTION public.consume_sms_credit(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_sms_credit(uuid, uuid, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.log_sms_send(uuid, uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_sms_send(uuid, uuid, uuid, text, text, text, text, text) TO service_role;

COMMIT;
