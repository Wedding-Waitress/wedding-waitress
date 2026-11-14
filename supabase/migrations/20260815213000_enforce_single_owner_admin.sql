-- Enforce one effective Wedding Waitress owner/admin account.
-- The owner is resolved from auth.users at migration time; no user UUID is hard-coded.

DO $$
DECLARE
  owner_user_id uuid;
  owner_match_count integer;
BEGIN
  SELECT count(*), (array_agg(id))[1]
    INTO owner_match_count, owner_user_id
  FROM auth.users
  WHERE lower(btrim(email)) = 'naderelalfy1977@gmail.com';

  IF owner_match_count <> 1 THEN
    RAISE EXCEPTION
      'Owner/admin enforcement aborted: expected exactly one matching auth user, found %',
      owner_match_count;
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (owner_user_id, 'admin'::public.app_role, owner_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
  WHERE role = 'admin'::public.app_role
    AND user_id <> owner_user_id;
END
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS role_row
    LEFT JOIN auth.users AS auth_user ON auth_user.id = role_row.user_id
    WHERE role_row.user_id = _user_id
      AND role_row.role = _role
      AND (
        _role <> 'admin'::public.app_role
        OR lower(btrim(auth_user.email)) = 'naderelalfy1977@gmail.com'
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION public.is_owner_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_owner_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_owner_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_admin() TO service_role;

CREATE OR REPLACE FUNCTION public.can_access_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = _event_id AND user_id = _user_id
  )
  OR public.has_role(_user_id, 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.event_collaborators
    WHERE event_id = _event_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.enforce_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  previous_is_owner_admin boolean := false;
  next_is_owner boolean := false;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.role = 'admin'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = OLD.user_id
        AND lower(btrim(email)) = 'naderelalfy1977@gmail.com'
    ) INTO previous_is_owner_admin;

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

  IF NEW.role = 'admin'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = NEW.user_id
        AND lower(btrim(email)) = 'naderelalfy1977@gmail.com'
    ) INTO next_is_owner;

    IF NOT next_is_owner THEN
      RAISE EXCEPTION 'Only the designated Wedding Waitress owner may hold the admin role'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS enforce_owner_admin_role_trigger ON public.user_roles;
CREATE TRIGGER enforce_owner_admin_role_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_owner_admin_role();

COMMENT ON FUNCTION public.is_owner_admin() IS
  'Returns true only when the authenticated user is the designated owner and has the canonical admin role.';

NOTIFY pgrst, 'reload schema';
