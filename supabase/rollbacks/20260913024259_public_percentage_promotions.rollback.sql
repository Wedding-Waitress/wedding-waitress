-- Data-preserving disablement. Never erase campaigns or redemption history.
BEGIN;
UPDATE public.promotion_campaigns SET active=false,updated_at=now();
REVOKE ALL ON FUNCTION public.admin_manage_promotion(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reserve_first_purchase_promotion(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.quote_first_purchase_promotion(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bind_promotion_checkout(uuid,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.record_verified_promotion_completion(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.activate_due_promotion(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.promotion_customer_binding(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.promotion_checkout_context(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.fulfill_promotion_checkout_atomic(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_promotion_state(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.promotion_session_active(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reconcile_expired_promotion_checkout(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_admin_promotion_payments() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.promotion_refund_payment_context(uuid) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION public.get_admin_platform_snapshot();
ALTER FUNCTION private.get_admin_platform_snapshot_before_promotions() SET SCHEMA public;
ALTER FUNCTION public.get_admin_platform_snapshot_before_promotions() RENAME TO get_admin_platform_snapshot;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;
-- Keep the credit and competing-purchase guards: existing redeemed offers must
-- not regain excluded credits or permit duplicate original terms after disabling.
COMMIT;
