-- Pending review: do not apply to a hosted database without explicit approval.
-- Keep the existing secure deletion endpoint; authorize admins from trusted database roles.
CREATE OR REPLACE FUNCTION public.delete_owned_event_secure(p_event_id uuid)
RETURNS TABLE(id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  target_owner_id uuid;
  caller_is_admin boolean;
  deleted_id uuid;
  deleted_owner_id uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- The database, not a frontend flag or editable JWT metadata, grants admin access.
  caller_is_admin := coalesce(public.has_role(caller_id, 'admin'::public.app_role), false);
  IF EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.member_user_id = caller_id AND am.role = 'standard'
      AND am.accepted_at IS NOT NULL AND am.access_disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Only the Master Account Holder or an authorized administrator can delete events'
      USING ERRCODE = '42501';
  END IF;

  -- Preserve ordinary-user ownership. Lock only an authorized target for deletion.
  SELECT e.user_id INTO target_owner_id FROM public.events e
  WHERE e.id = p_event_id AND (e.user_id = caller_id OR caller_is_admin)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or deletion is not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT caller_is_admin AND NOT public.is_account_operational(caller_id) THEN
    RAISE EXCEPTION 'Account is not operational' USING ERRCODE = '42501';
  END IF;

  -- Existing event DELETE triggers/cascades remain the authoritative related-data cleanup.
  DELETE FROM public.events e
  WHERE e.id = p_event_id AND e.user_id = target_owner_id
  RETURNING e.id, e.user_id INTO deleted_id, deleted_owner_id;
  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'Event deletion did not affect a row' USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY SELECT deleted_id, deleted_owner_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_owned_event_secure(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_owned_event_secure(uuid) TO authenticated;
