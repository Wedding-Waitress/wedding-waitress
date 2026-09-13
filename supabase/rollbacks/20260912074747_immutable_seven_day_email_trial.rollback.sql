-- DATA-PRESERVING WITHDRAWAL ONLY: eligibility must never be reset on rollback.
-- Keep private history and Auth identity/immutability triggers. Keep the legacy
-- extra-trial-extension endpoint revoked. Existing history is not deleted.
-- Keep automatic access-expiry cleanup RPCs revoked: expiry is not erasure.
-- Keep planning/storage/pre-request guards and the safe return eligibility
-- predicate; withdrawing the UI endpoint must not reopen expired access.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.get_my_trial_state() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_customer_entitlement() FROM PUBLIC,anon,authenticated;
COMMIT;
