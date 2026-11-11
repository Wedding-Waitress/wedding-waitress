BEGIN;
-- Preserve each existing implementation, result type, owner checks and audit writes.
-- Browser callers reach only the wrapper, which requires recent SMS verification.
DO $$
DECLARE target record; original_name text; argument_names text; body text;
BEGIN
 FOR target IN
  SELECT p.oid,p.proname,p.pronargs,p.proargnames,p.proretset,p.provolatile,
   pg_get_function_arguments(p.oid) AS arguments,pg_get_function_identity_arguments(p.oid) AS identity_arguments,
   pg_get_function_result(p.oid) AS result
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
   'get_admin_platform_snapshot','get_admin_centre_snapshot','get_admin_promotion_payments',
   'admin_get_customer_activity','admin_get_customer_account_preview','admin_get_customer_team_roster',
   'admin_get_account_access_detail','get_account_closure_admin_summary'])
 LOOP
  original_name:='admin_unverified_'||target.proname;
  SELECT string_agg(format('%I',target.proargnames[n]),', ' ORDER BY n) INTO argument_names
   FROM generate_series(1,target.pronargs) n;
  EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I',target.proname,target.identity_arguments,original_name);
  EXECUTE format('ALTER FUNCTION public.%I(%s) SET SCHEMA private',original_name,target.identity_arguments);
  EXECUTE format('REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC,anon,authenticated,service_role',original_name,target.identity_arguments);
  body:=format('BEGIN PERFORM private.require_recent_admin_verification(); %s private.%I(%s); END',
   CASE WHEN target.proretset THEN 'RETURN QUERY SELECT * FROM' ELSE 'RETURN' END,original_name,coalesce(argument_names,''));
  EXECUTE format('CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE plpgsql %s SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS %L',
   target.proname,target.arguments,target.result,CASE WHEN target.provolatile='v' THEN 'VOLATILE' ELSE 'STABLE' END,body);
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon,service_role',target.proname,target.identity_arguments);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',target.proname,target.identity_arguments);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
