-- Withdraw recovery API; preserve audit/idempotency history and account blocks.
BEGIN;
REVOKE ALL ON FUNCTION public.admin_retry_failed_session_revocation(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION public.admin_retry_failed_session_revocation(uuid,uuid,text);
-- Keep private.admin_session_revocation_recovery: do not destroy replay evidence.
COMMIT;
