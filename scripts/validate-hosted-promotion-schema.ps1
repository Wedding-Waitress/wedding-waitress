$ErrorActionPreference='Stop'
$promotionRoot=Split-Path -Parent $PSScriptRoot
$promotionPsql=Join-Path $promotionRoot 'work/postgresql-17.11-portable/pgsql/bin/psql.exe'
$promotionDatabase='ww_promo_hosted_' + [guid]::NewGuid().ToString('N').Substring(0,12)
$promotionCreated=$false
function Invoke-PromotionSchema([string]$Database,[string]$Sql) {
 if($Database -ne 'admin_activity_validation_final' -and $Database -ne $promotionDatabase){throw 'Local scope guard failed'}
 $promotionStart=New-Object System.Diagnostics.ProcessStartInfo
 $promotionStart.FileName=$promotionPsql
 $promotionStart.Arguments="-X -q -A -t -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d $Database"
 $promotionStart.UseShellExecute=$false;$promotionStart.CreateNoWindow=$true
 $promotionStart.RedirectStandardInput=$true;$promotionStart.RedirectStandardOutput=$true;$promotionStart.RedirectStandardError=$true
 $promotionStart.StandardInputEncoding=New-Object System.Text.UTF8Encoding($false)
 $promotionProcess=New-Object System.Diagnostics.Process;$promotionProcess.StartInfo=$promotionStart
 [void]$promotionProcess.Start()
 try { $promotionProcess.StandardInput.WriteLine($Sql);$promotionProcess.StandardInput.Close() }
 catch { throw ('Schema input failed: '+$promotionProcess.StandardError.ReadToEnd()) }
 $promotionOutput=$promotionProcess.StandardOutput.ReadToEnd();$promotionError=$promotionProcess.StandardError.ReadToEnd()
 $promotionProcess.WaitForExit()
 if($promotionProcess.ExitCode -ne 0){throw "Schema validation failed: $promotionError"}
 return $promotionOutput
}
try {
 $promotionBackup=Get-ChildItem (Join-Path $promotionRoot 'work/production-backups') -Filter 'wedding_waitress_prod_schema_pre_promotions_20260913_*.sql' | Where-Object Length -GT 10000 | Sort-Object LastWriteTime -Descending | Select-Object -First 1
 if(-not $promotionBackup){throw 'Verified schema backup missing'}
 $promotionSchema=Get-Content -Raw -Encoding UTF8 -LiteralPath $promotionBackup.FullName
 if($promotionSchema -notmatch 'PostgreSQL database dump complete'){throw 'Incomplete schema backup'}
 # Restore application, Auth and Storage definitions only. Hosted extension workers
 # and global role ownership are platform-managed, not installed in this local DB.
 $promotionBlocks=[regex]::Split($promotionSchema,'(?m)(?=^-- Name:)')
 $promotionSelected=foreach($promotionBlock in $promotionBlocks){
  if($promotionBlock -notmatch '^-- Name:'){ $promotionBlock -replace '(?m)^\\.*$','';continue }
  if($promotionBlock -notmatch '^-- Name:.*; Type: ([^;]+); Schema: ([^;]+);'){continue}
  $promotionType=$Matches[1];$promotionNamespace=$Matches[2]
  if($promotionType -match '^PUBLICATION' -or $promotionType -in @('EVENT TRIGGER','DEFAULT ACL')){continue}
  if($promotionNamespace -notin @('public','private','auth','storage','event_branding_private','extensions','-')){continue}
  if($promotionType -eq 'SCHEMA' -and $promotionBlock -notmatch 'CREATE SCHEMA "(public|private|auth|storage|event_branding_private|extensions)"'){continue}
  if($promotionType -eq 'ACL' -and $promotionNamespace -eq '-' -and $promotionBlock -notmatch 'ON SCHEMA "(public|private|auth|storage|event_branding_private|extensions)"'){continue}
  if($promotionType -eq 'EXTENSION' -and $promotionBlock -notmatch 'CREATE EXTENSION IF NOT EXISTS "(pgcrypto|uuid-ossp)"'){continue}
  if($promotionType -eq 'COMMENT' -and $promotionBlock -match 'COMMENT ON EXTENSION' -and $promotionBlock -notmatch 'COMMENT ON EXTENSION "(pgcrypto|uuid-ossp)"'){continue}
  if($promotionType -eq 'ACL' -and $promotionBlock -match 'supabase_auth_admin|supabase_storage_admin|dashboard_user'){continue}
  if($promotionNamespace -eq 'extensions' -and $promotionType -eq 'ACL'){continue}
  $promotionBlock -replace '(?m)^ALTER .* OWNER TO .*;\r?$','' -replace '(?m)^\\.*$',''
 }
 [void](Invoke-PromotionSchema 'admin_activity_validation_final' "CREATE DATABASE $promotionDatabase TEMPLATE template0;")
 $promotionCreated=$true
 [void](Invoke-PromotionSchema $promotionDatabase ($promotionSelected -join "`n"))
 [void](Invoke-PromotionSchema $promotionDatabase @'
INSERT INTO public.subscription_plans(id,name,price_aud,is_active,duration_days,extra_event_price) VALUES
 ('fe3c6c39-01eb-47c8-b8c1-5a0efb48562d','Starter',0,true,7,99),
 ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','Essential',150,true,365,99),
 ('1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','Premium',200,true,365,99),
 ('cd10f207-2109-4546-a635-0baa68ba8213','Unlimited',300,true,365,99);
INSERT INTO auth.users(id,email,email_confirmed_at,created_at,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','fixture_recent@example.test',now(),now()-interval '1 day','{"first_name":"Fixture","last_name":"Recent"}'),
 ('22222222-2222-4222-8222-222222222222','fixture_expired@example.test',now(),now()-interval '8 days','{"first_name":"Fixture","last_name":"Expired"}');
'@)
 $promotionMigrations=@('20260912045140_account_suspension_access_and_replies.sql','20260912054344_admin_logical_deletion_retention.sql','20260912074042_retained_account_closure_original_entitlement.sql','20260912074747_immutable_seven_day_email_trial.sql','20260912082420_idempotent_original_paid_plan_fulfillment.sql','20260913024259_public_percentage_promotions.sql')
 foreach($promotionMigration in $promotionMigrations){
  $promotionSql=Get-Content -Raw -Encoding UTF8 (Join-Path $promotionRoot "supabase/migrations/$promotionMigration")
  # Do not change cluster-wide authenticator settings during fixture validation.
  $promotionSql=$promotionSql -replace '(?im)^alter role authenticator set pgrst\.db_pre_request=.*;\r?$',''
  # Hosted authenticator config was checked separately and has no pre-request
  # handler. The existing local fixture cluster has its own unrelated handler.
  $promotionSql=$promotionSql -replace '(?is)do \$\$ begin\s+if exists\(select 1 from pg_roles.*?Existing pre-request handler must be reviewed before this migration.*?end; \$\$;',''
  [void](Invoke-PromotionSchema $promotionDatabase $promotionSql)
  Write-Output "Validated $promotionMigration"
 }
 [void](Invoke-PromotionSchema $promotionDatabase @'
DO $$ BEGIN
 IF (SELECT count(*) FROM private.account_trial_history)<>2 THEN RAISE EXCEPTION 'Existing fixture accounts were not backfilled'; END IF;
 IF EXISTS(SELECT 1 FROM private.account_trial_history h JOIN auth.users u ON u.id=h.account_user_id WHERE h.first_signup_at<>u.created_at OR h.trial_ends_at<>u.created_at+interval '7 days') THEN RAISE EXCEPTION 'Original trial timing changed'; END IF;
 IF (SELECT status FROM public.user_subscriptions WHERE user_id='22222222-2222-4222-8222-222222222222')<>'expired' THEN RAISE EXCEPTION 'Expired trial was extended'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id WHERE p.price_aud<>0) THEN RAISE EXCEPTION 'Backfill granted paid access'; END IF;
 IF has_function_privilege('anon','public.reserve_first_purchase_promotion(uuid,text,text)','EXECUTE') OR has_function_privilege('authenticated','public.fulfill_promotion_checkout_atomic(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Privileged promotional API exposed'; END IF;
 IF NOT has_function_privilege('service_role','public.fulfill_promotion_checkout_atomic(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Service fulfillment unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='private' AND c.relname LIKE 'promotion_%' OR n.nspname='public' AND c.relname IN ('promotion_campaigns','paid_plan_purchases')) AND c.relkind='r' AND NOT c.relrowsecurity) THEN RAISE EXCEPTION 'Promotional RLS missing'; END IF;
END $$;
'@)
 Write-Output 'PASS: existing-account trial backfill preserves original signup, expires old trials, grants no paid access, and promotional RLS/service-only boundaries hold.'
 Write-Output 'PASS: fresh hosted application/Auth/Storage schema accepts the prerequisite and promotional migration chain; no customer data copied.'
} finally {
 if($promotionCreated -and $promotionDatabase -match '^ww_promo_hosted_[0-9a-f]{12}$'){
  [void](Invoke-PromotionSchema 'admin_activity_validation_final' "DROP DATABASE $promotionDatabase;")
 }
}
