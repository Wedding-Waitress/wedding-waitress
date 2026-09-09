-- Roll back the permanent platform-owner bypass while retaining UUID-only admin protection.

DROP TRIGGER IF EXISTS enforce_owner_admin_role_trigger ON public.user_roles;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS role_row
    WHERE role_row.user_id = _user_id
      AND role_row.role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.subscription_allows_event_edit(owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions AS subscription
    WHERE subscription.user_id = owner_id
      AND subscription.status = 'active'
      AND subscription.is_read_only = false
      AND now() <= subscription.expires_at
  )
$$;

REVOKE ALL ON FUNCTION public.subscription_allows_event_edit(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  verified_owner_id constant uuid := 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa';
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE')
     AND OLD.role = 'admin'::public.app_role
     AND OLD.user_id = verified_owner_id THEN
    IF TG_OP = 'DELETE'
       OR NEW.role <> 'admin'::public.app_role
       OR NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'The designated owner admin role cannot be removed or reassigned'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.role = 'admin'::public.app_role AND NEW.user_id <> verified_owner_id THEN
    RAISE EXCEPTION 'Only the designated Wedding Waitress owner may hold the admin role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER enforce_owner_admin_role_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_owner_admin_role();

DROP FUNCTION IF EXISTS public.has_platform_owner_access();
DROP FUNCTION IF EXISTS private.is_platform_owner(uuid);
DROP TABLE IF EXISTS private.platform_owners;

NOTIFY pgrst, 'reload schema';
