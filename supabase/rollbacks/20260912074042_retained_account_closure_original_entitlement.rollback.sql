-- DATA-PRESERVING WITHDRAWAL ONLY. Do not reinstate a legacy reopen endpoint
-- that could release ordinary closed accounts after their original paid expiry.
-- Retained lifecycle records, original dates and access blocks remain intact.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.deactivate_my_account() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_account_return_eligibility() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.reactivate_my_account() FROM PUBLIC,anon,authenticated;
-- Verified owner-only administrative recovery remains separately available.
COMMIT;
