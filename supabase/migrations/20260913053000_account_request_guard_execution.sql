-- PostgREST runs db-pre-request after switching to the caller's API role.
-- This no-result guard must be executable by those roles to enforce its checks.
-- Keep the private wrapped guard and all entitlement/RLS rules unchanged.
BEGIN;
GRANT EXECUTE ON FUNCTION public.guard_suspended_data_request() TO anon, authenticated, service_role;
COMMIT;
