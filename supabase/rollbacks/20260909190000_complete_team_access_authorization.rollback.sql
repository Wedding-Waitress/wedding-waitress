-- Data-preserving operational rollback for account-wide Team & Access.
-- It disables the Edge workflow first, then contracts every policy that calls
-- can_access_event() back to the event owner. Team records remain available for
-- audit and a corrected roll-forward; no Auth users or event data are deleted.

CREATE OR REPLACE FUNCTION public.internal_team_access_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT false $$;
REVOKE ALL ON FUNCTION public.internal_team_access_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_team_access_ready() TO service_role;

CREATE OR REPLACE FUNCTION public.can_access_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      public.has_role(_user_id, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = _event_id
          AND e.user_id = _user_id
          AND public.is_account_operational(_user_id)
      )
    )
$$;
REVOKE ALL ON FUNCTION public.can_access_event(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_event(uuid, uuid) TO authenticated, service_role;

-- The profile trigger is part of Team provisioning. Removing it prevents new
-- membership rows while this feature is rolled back; existing rows are kept.
DROP TRIGGER IF EXISTS ensure_profile_account_master_trigger ON public.profiles;
