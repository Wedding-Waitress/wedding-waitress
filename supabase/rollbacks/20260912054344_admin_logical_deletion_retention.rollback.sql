-- DATA-PRESERVING rollback: withdraw new admin API and snapshot enrichment.
-- KEEP admin_deleted_at, the protection trigger, and purge exclusion. An approved
-- retention hold must not become an automatic purge or customer self-reactivation.
-- Forward recovery of held accounts requires the reviewed owner restoration RPC.
-- Also retain Auth/profile/event/control record guards, the service-only retention
-- check and the complete-purge safety wrapper; withdrawing UI APIs cannot erase holds.
BEGIN;
DROP FUNCTION public.admin_suspend_account(uuid,text,text,uuid);
ALTER FUNCTION private.admin_suspend_account(uuid,text,text,uuid) SET SCHEMA public;
DROP FUNCTION public.get_my_account_access();
ALTER FUNCTION private.get_my_account_access() SET SCHEMA public;
GRANT EXECUTE ON FUNCTION public.get_my_account_access() TO authenticated;
DROP FUNCTION public.get_admin_platform_snapshot();
ALTER FUNCTION private.get_admin_platform_snapshot() SET SCHEMA public;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.admin_logically_delete_account(uuid,uuid,text),
  public.admin_restore_deleted_account(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
