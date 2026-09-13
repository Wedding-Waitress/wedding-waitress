-- Disable the feature first. Preserve financial evidence and audit/customer data.
BEGIN;
REVOKE ALL ON FUNCTION public.admin_reserve_payment_refund(jsonb,uuid),public.admin_record_payment_refund(uuid,text,text) FROM service_role;
REVOKE ALL ON public.admin_payment_refunds FROM service_role;
-- Intentionally retain the ledger and functions: do not erase refund evidence.
COMMIT;
