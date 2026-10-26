-- Permanent Wedding Waitress platform-owner entitlement.
-- Authorization is keyed only by the verified Supabase Auth UUID and is stored
-- in a private, singleton backend table that authenticated clients cannot edit.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE private.platform_owners (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

REVOKE ALL ON TABLE private.platform_owners FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  verified_owner_id constant uuid := 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa';
BEGIN
  -- Keep the private owner table empty on a no-data development branch.
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = verified_owner_id) THEN
    RAISE EXCEPTION 'Platform-owner migration aborted: verified Auth UUID does not exist';
  END IF;

  INSERT INTO private.platform_owners (singleton, user_id)
  VALUES (true, verified_owner_id);

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (verified_owner_id, 'admin'::public.app_role, verified_owner_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END
$$;

CREATE OR REPLACE FUNCTION private.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM private.platform_owners AS owner_row
      WHERE owner_row.user_id = _user_id
    )
$$;

REVOKE ALL ON FUNCTION private.is_platform_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_platform_owner(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.has_platform_owner_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT private.is_platform_owner((SELECT auth.uid()))
$$;

REVOKE ALL ON FUNCTION public.has_platform_owner_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_platform_owner_access() TO authenticated, service_role;

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
      AND (
        _role <> 'admin'::public.app_role
        OR private.is_platform_owner(_user_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.subscription_allows_event_edit(owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT private.is_platform_owner(owner_id)
    OR EXISTS (
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
  previous_is_owner_admin boolean := false;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.role = 'admin'::public.app_role THEN
    previous_is_owner_admin := private.is_platform_owner(OLD.user_id);

    IF previous_is_owner_admin AND TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'The designated owner admin role cannot be removed or reassigned'
        USING ERRCODE = '42501';
    END IF;

    IF previous_is_owner_admin AND TG_OP = 'UPDATE'
       AND (NEW.role <> 'admin'::public.app_role OR NEW.user_id <> OLD.user_id) THEN
      RAISE EXCEPTION 'The designated owner admin role cannot be removed or reassigned'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.role = 'admin'::public.app_role
     AND NOT private.is_platform_owner(NEW.user_id) THEN
    RAISE EXCEPTION 'Only the designated Wedding Waitress platform owner may hold the admin role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END
$$;

COMMENT ON TABLE private.platform_owners IS
  'Backend-controlled singleton entitlement for the permanent Wedding Waitress platform owner.';
COMMENT ON FUNCTION public.has_platform_owner_access() IS
  'Returns whether the authenticated caller has the private platform-owner entitlement.';
COMMENT ON FUNCTION public.is_owner_admin() IS
  'Returns true only when the authenticated platform owner also has the canonical admin role.';

NOTIFY pgrst, 'reload schema';
