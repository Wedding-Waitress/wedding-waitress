-- Data-preserving operational rollback for the secure Team & Access workflow.
-- Apply only if the matching migration must be disabled. Invitation/member
-- records and identity columns are intentionally retained for audit/recovery.

CREATE OR REPLACE FUNCTION public.internal_team_access_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT false $$;
REVOKE ALL ON FUNCTION public.internal_team_access_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_team_access_ready() TO service_role;

-- Remove the Edge Function's mutation capability while preserving the schema
-- and records needed to diagnose or safely roll forward later.
REVOKE EXECUTE ON FUNCTION public.internal_create_account_invitation(uuid, text, text, text, text, text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.internal_preview_account_invitation(uuid, text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.internal_accept_account_invitation(uuid, text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.internal_revoke_account_invitation(uuid, uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.internal_remove_account_member(uuid, uuid) FROM service_role;
