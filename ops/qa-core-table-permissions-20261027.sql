-- QA ONLY ckmgjbwifbzzknnyxzqe. Does not change production or RLS policies.
-- Replay omitted core CRUD grants that exist in production.
-- Grant only operations required by the customer workflow; no anonymous writes,
-- subscription writes, TRUNCATE or policy bypass is introduced.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_class WHERE oid IN
 ('public.events'::regclass,'public.guests'::regclass,'public.profiles'::regclass,
  'public.user_subscriptions'::regclass,'public.subscription_plans'::regclass)
 AND NOT relrowsecurity) THEN RAISE EXCEPTION 'RLS required'; END IF;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events, public.guests, public.profiles TO authenticated;
GRANT SELECT ON public.user_subscriptions, public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;
COMMIT;
