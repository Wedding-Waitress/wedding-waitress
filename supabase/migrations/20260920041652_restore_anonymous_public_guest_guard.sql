
-- PostgREST invokes this no-result pre-request guard for every Data API call.
-- The guard itself only applies planning restrictions to authenticated users;
-- anon needs EXECUTE solely so public QR/guest links can reach their existing
-- SECURITY DEFINER, column-limited RPCs. This does not grant table access.
GRANT EXECUTE ON FUNCTION public.guard_suspended_data_request() TO anon;
