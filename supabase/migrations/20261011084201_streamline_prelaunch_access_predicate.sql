-- Equivalent private predicate: the configured owner UUID must still be both
-- a platform owner and a server-assigned admin. No grant or guard is removed.
CREATE OR REPLACE FUNCTION private.prelaunch_access_allowed(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT NOT c.enabled OR EXISTS (
   SELECT 1 FROM private.platform_owners po
   JOIN public.user_roles ur ON ur.user_id=po.user_id AND ur.role='admin'::public.app_role
   WHERE po.user_id=p_user AND p_user=c.owner_user_id
 ) FROM private.prelaunch_control c WHERE singleton;
$$;
