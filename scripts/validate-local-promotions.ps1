$ErrorActionPreference = 'Stop'
$promotionRoot = Split-Path -Parent $PSScriptRoot
$promotionPsql = Join-Path $promotionRoot 'work/postgresql-17.11-portable/pgsql/bin/psql.exe'
function Read-PromotionDefinitions([string]$RelativePath) {
  (Get-Content -Raw (Join-Path $promotionRoot $RelativePath)) -replace '(?m)^BEGIN;\r?\n','' -replace '(?m)^COMMIT;\s*$',''
}
$promotionGuard = @'
DO $$ BEGIN IF current_database()<>'admin_activity_validation_final' OR inet_server_addr()<>'127.0.0.1'::inet THEN RAISE EXCEPTION 'Local database guard failed'; END IF; END $$;
BEGIN;
'@
$promotionAssertions = @'
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $fixture$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $fixture$;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('11111111-1111-1111-1111-111111111111','naderelalfy1977@gmail.com',now());
INSERT INTO public.user_roles(user_id,role) VALUES('11111111-1111-1111-1111-111111111111','admin');
INSERT INTO auth.sessions(id,user_id) VALUES('77777777-7777-4777-8777-777777777777','11111111-1111-1111-1111-111111111111');
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","session_id":"77777777-7777-4777-8777-777777777777"}',true);
DO $$ DECLARE cid uuid; rid uuid; snapshot jsonb; evidence jsonb; result jsonb; BEGIN
 INSERT INTO public.promotion_campaigns(code,campaign_name,percent_off,created_by) VALUES('REPORT50','Local reporting fixture',50,'11111111-1111-1111-1111-111111111111') RETURNING id INTO cid;
 INSERT INTO private.promotion_redemptions(campaign_id,normalized_email,account_user_id,plan_key,percent_off,included_credits,state,stripe_session_id,stripe_payment_intent_id,livemode,amount_total_cents,completed_at)
 VALUES(cid,'fixture@example.test','11111111-1111-1111-1111-111111111111','essential',50,150,'completed','cs_reportfixture','pi_reportfixture',true,10945,now()) RETURNING id INTO rid;
 snapshot:=public.get_admin_platform_snapshot();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'payments') p WHERE p->>'id'=rid::text AND p->>'payment_type'='promotion_plan_purchase' AND (p->>'amount_paid')::numeric=109.45) THEN RAISE EXCEPTION 'Promotional payment missing or incorrect'; END IF;
 DELETE FROM auth.sessions WHERE id='77777777-7777-4777-8777-777777777777';
 BEGIN PERFORM public.get_admin_platform_snapshot(); RAISE EXCEPTION 'Revoked reporting session accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 IF public.promotion_refund_payment_context(rid)->>'user_id'<>'11111111-1111-1111-1111-111111111111' THEN RAISE EXCEPTION 'Refund identity mismatch'; END IF;
 INSERT INTO private.promotion_redemptions(campaign_id,normalized_email,account_user_id,plan_key,percent_off,included_credits,stripe_session_id,stripe_customer_id,stripe_coupon_id,stripe_product_id,livemode)
 VALUES(cid,'recovery@example.test','11111111-1111-1111-1111-111111111111','essential',51,0,'cs_expiredfixture','cus_fixture','coupon_fixture','prod_UOQhHcOhFdrhOs',true) RETURNING id INTO rid;
 evidence:=jsonb_build_object('id','cs_expiredfixture','status','expired','payment_status','unpaid','mode','payment','customer','cus_fixture','livemode',true,'payment_intent',NULL,'metadata',jsonb_build_object('promotion_reservation_id',rid,'user_id','11111111-1111-1111-1111-111111111111'));
 BEGIN PERFORM public.reconcile_expired_promotion_checkout(rid,evidence||jsonb_build_object('payment_status','paid')); RAISE EXCEPTION 'Unsafe paid recovery accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Unsafe paid recovery accepted' THEN RAISE; END IF; END;
 result:=public.reconcile_expired_promotion_checkout(rid,evidence);
 IF result->>'result'<>'reconciled' OR NOT EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE id=rid AND attempt_number=1 AND state='reserved' AND stripe_session_id IS NULL AND included_credits=0) THEN RAISE EXCEPTION 'Recovery state mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.promotion_expired_attempts WHERE reservation_id=rid AND stripe_session_id='cs_expiredfixture' AND attempt_number=0) THEN RAISE EXCEPTION 'Attempt history lost'; END IF;
 PERFORM public.reconcile_expired_promotion_checkout(rid,evidence);
 IF (SELECT attempt_number FROM private.promotion_redemptions WHERE id=rid)<>1 THEN RAISE EXCEPTION 'Replay reset history'; END IF;
 IF has_function_privilege('authenticated','public.reconcile_expired_promotion_checkout(uuid,jsonb)','EXECUTE') OR has_function_privilege('anon','public.reconcile_expired_promotion_checkout(uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Public recovery grant'; END IF;
END $$;
'@
$promotionRollbackAssertions = @'
DO $$ BEGIN
 IF to_regprocedure('public.get_admin_platform_snapshot()') IS NULL OR to_regprocedure('private.get_admin_platform_snapshot_before_promotions()') IS NOT NULL THEN RAISE EXCEPTION 'Reporting rollback mismatch'; END IF;
 IF (SELECT count(*) FROM private.promotion_expired_attempts)<>1 OR (SELECT count(*) FROM private.promotion_redemptions)<>2 THEN RAISE EXCEPTION 'Rollback erased financial history'; END IF;
END $$;
ROLLBACK;
'@
$promotionValidation = $promotionGuard +
  (Read-PromotionDefinitions 'supabase/migrations/20260912082420_idempotent_original_paid_plan_fulfillment.sql') +
  (Read-PromotionDefinitions 'supabase/migrations/20260913024259_public_percentage_promotions.sql') +
  $promotionAssertions +
  (Read-PromotionDefinitions 'supabase/rollbacks/20260913024259_public_percentage_promotions.rollback.sql') +
  $promotionRollbackAssertions
$promotionValidation | & $promotionPsql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d admin_activity_validation_final
if ($LASTEXITCODE -ne 0) { throw 'Local promotional validation failed; connection close rolls back the transaction.' }
