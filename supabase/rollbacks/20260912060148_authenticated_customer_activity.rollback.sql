-- Preserve recorded timestamps; disable collection and withdraw live publication.
-- Run before the logical-deletion migration rollback, in reverse release order.
BEGIN;
DROP TRIGGER record_customer_sign_in ON auth.users;
DROP TRIGGER record_customer_profile_update ON public.profiles;
REVOKE ALL ON FUNCTION public.record_authenticated_customer_activity(),public.admin_get_customer_activity() FROM PUBLIC,anon,authenticated,service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='customer_account_activity') THEN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_account_activity;
 END IF;
END $$;
DROP FUNCTION public.get_admin_platform_snapshot();
ALTER FUNCTION private.get_admin_platform_snapshot_access_controls() SET SCHEMA public;
ALTER FUNCTION public.get_admin_platform_snapshot_access_controls() RENAME TO get_admin_platform_snapshot;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
