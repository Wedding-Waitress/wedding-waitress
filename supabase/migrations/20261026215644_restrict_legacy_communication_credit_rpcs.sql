-- Legacy helpers are server operations, not public customer APIs.
-- No application/Edge source caller uses these helpers directly. Preserve
-- trusted service access; do not alter balances, rates or message delivery.
REVOKE ALL ON FUNCTION public.deduct_communication_credit(uuid,uuid,uuid,text,numeric,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.check_communication_credits(uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_communication_credit(uuid,uuid,uuid,text,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_communication_credits(uuid,text,integer) TO service_role;
