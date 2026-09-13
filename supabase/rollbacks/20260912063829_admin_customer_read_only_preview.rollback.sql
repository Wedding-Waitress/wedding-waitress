BEGIN;
REVOKE ALL ON FUNCTION public.admin_get_customer_account_preview(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.admin_get_customer_team_roster(uuid) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION public.get_admin_platform_snapshot();
ALTER FUNCTION private.get_admin_platform_snapshot_activity() SET SCHEMA public;
ALTER FUNCTION public.get_admin_platform_snapshot_activity() RENAME TO get_admin_platform_snapshot;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;
-- Preserve access audit and all customer records.
NOTIFY pgrst,'reload schema';
COMMIT;
