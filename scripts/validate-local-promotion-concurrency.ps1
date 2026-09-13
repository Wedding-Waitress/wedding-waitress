$ErrorActionPreference = 'Stop'
$promotionRoot = Split-Path -Parent $PSScriptRoot
$promotionPsql = Join-Path $promotionRoot 'work/postgresql-17.11-portable/pgsql/bin/psql.exe'
$promotionFixture = 'ww_promo_concurrency_' + [guid]::NewGuid().ToString('N').Substring(0,12)
if ($promotionFixture -notmatch '^ww_promo_concurrency_[0-9a-f]{12}$') { throw 'Fixture name guard failed' }
$promotionCreated = $false
function Start-PromotionQuery([string]$Database, [string]$Sql) {
  if ($Database -ne 'admin_activity_validation_final' -and $Database -ne $promotionFixture) { throw 'Database scope guard failed' }
  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName = $promotionPsql
  $start.Arguments = "-X -q -A -t -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d $Database"
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $start
  [void]$process.Start()
  $process.StandardInput.WriteLine($Sql)
  $process.StandardInput.Close()
  return $process
}
function Complete-PromotionQuery($Process, [bool]$ExpectFailure = $false) {
  $output = $Process.StandardOutput.ReadToEnd()
  $failure = $Process.StandardError.ReadToEnd()
  if (-not $Process.WaitForExit(45000)) { throw 'Local fixture query timed out' }
  if ($ExpectFailure) {
    if ($Process.ExitCode -eq 0) { throw 'Unsafe fixture query unexpectedly succeeded' }
    return $failure
  }
  if ($Process.ExitCode -ne 0) { throw "Local fixture query failed: $failure" }
  return $output.Trim()
}
function Invoke-PromotionQuery([string]$Database, [string]$Sql) {
  Complete-PromotionQuery (Start-PromotionQuery $Database $Sql)
}
function Read-PromotionDefinitions([string]$Path) {
  (Get-Content -Raw (Join-Path $promotionRoot $Path)) -replace '(?m)^BEGIN;\r?\n','' -replace '(?m)^COMMIT;\s*$',''
}
try {
  # Only schema is copied; customer identities and event data are never cloned.
  [void](Invoke-PromotionQuery 'admin_activity_validation_final' @'
DO $$ BEGIN
 IF current_database()<>'admin_activity_validation_final' OR inet_server_addr()<>'127.0.0.1'::inet
 OR to_regclass('public.promotion_campaigns') IS NOT NULL THEN RAISE EXCEPTION 'Local source-schema guard failed'; END IF;
END $$;
'@)
  $promotionDump = Join-Path $promotionRoot 'work/postgresql-17.11-portable/pgsql/bin/pg_dump.exe'
  $schema = (& $promotionDump --schema-only -h 127.0.0.1 -p 5432 -U postgres -d admin_activity_validation_final) -join "`n"
  if ($LASTEXITCODE -ne 0 -or -not $schema) { throw 'Local schema-only export failed' }
  [void](Invoke-PromotionQuery 'admin_activity_validation_final' "CREATE DATABASE $promotionFixture TEMPLATE template0;")
  $promotionCreated = $true
  [void](Invoke-PromotionQuery $promotionFixture $schema)
  $setup = ('BEGIN; DO $$ BEGIN IF current_database()<>''{0}'' OR inet_server_addr()<>''127.0.0.1''::inet THEN RAISE EXCEPTION ''Fixture guard failed''; END IF; END $$;' -f $promotionFixture) +
    (Read-PromotionDefinitions 'supabase/migrations/20260912082420_idempotent_original_paid_plan_fulfillment.sql') +
    (Read-PromotionDefinitions 'supabase/migrations/20260913024259_public_percentage_promotions.sql') + @'
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('11111111-1111-4111-8111-111111111111','concurrency@example.test',now());
INSERT INTO public.account_members(account_owner_id,member_user_id,role,accepted_at)
 VALUES('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','master',now());
INSERT INTO public.promotion_campaigns(code,campaign_name,percent_off,created_by)
 VALUES('CONCURRENT51','Disposable concurrency test',51,'11111111-1111-4111-8111-111111111111');
COMMIT;
'@
  [void](Invoke-PromotionQuery $promotionFixture $setup)
  $reserve = @'
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
SELECT public.reserve_first_purchase_promotion('11111111-1111-4111-8111-111111111111','CONCURRENT51','essential')->>'id';
COMMIT;
'@
  $workers = @(1..8 | ForEach-Object { Start-PromotionQuery $promotionFixture $reserve })
  $identities = @($workers | ForEach-Object { Complete-PromotionQuery $_ })
  if (@($identities | Select-Object -Unique).Count -ne 1 -or $identities[0] -notmatch '^[0-9a-f-]{36}$') {
    throw 'Concurrent requests did not return one reservation identity'
  }
  [void](Invoke-PromotionQuery $promotionFixture @'
DO $$ BEGIN
 IF (SELECT count(*) FROM private.promotion_redemptions)<>1
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE included_credits<>0 OR plan_key<>'essential') THEN
  RAISE EXCEPTION 'Concurrent reservation duplicated or changed its offer'; END IF;
END $$;
'@)
  $changedPackage = Complete-PromotionQuery (Start-PromotionQuery $promotionFixture ($reserve.Replace("'essential'", "'premium'"))) $true
  if ($changedPackage -notmatch 'reserved for another checkout') { throw 'Package substitution did not fail at the intended boundary' }
  # A genuinely separate connection must wait on the account-return boundary.
  $holder = Start-PromotionQuery $promotionFixture @'
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('account-return:11111111-1111-4111-8111-111111111111',0));
SELECT 'LOCKED';
SELECT pg_sleep(3);
ROLLBACK;
'@
  do { $lockReady = $holder.StandardOutput.ReadLine() } while ($null -ne $lockReady -and $lockReady -ne 'LOCKED')
  if ($lockReady -ne 'LOCKED') { throw 'Fixture lock holder did not become ready' }
  $contender = Complete-PromotionQuery (Start-PromotionQuery $promotionFixture ($reserve.Replace('BEGIN;', "BEGIN; SET LOCAL lock_timeout='200ms';"))) $true
  [void](Complete-PromotionQuery $holder)
  if ($contender -notmatch 'lock timeout') { throw 'Account-return contention was not enforced' }
  [void](Invoke-PromotionQuery $promotionFixture $reserve)
  [void](Invoke-PromotionQuery $promotionFixture @'
UPDATE private.promotion_redemptions SET stripe_session_id='cs_expiredfixture',stripe_customer_id='cus_fixture',livemode=true;
'@)
  $recovery = @'
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
SELECT public.reconcile_expired_promotion_checkout(id,jsonb_build_object(
 'id','cs_expiredfixture','status','expired','payment_status','unpaid','mode','payment','customer','cus_fixture',
 'livemode',true,'payment_intent',NULL,'metadata',jsonb_build_object('promotion_reservation_id',id,'user_id',account_user_id)))->>'result'
 FROM private.promotion_redemptions;
COMMIT;
'@
  $recoveryWorkers = @(1..6 | ForEach-Object { Start-PromotionQuery $promotionFixture $recovery })
  $recoveryResults = @($recoveryWorkers | ForEach-Object { Complete-PromotionQuery $_ })
  if (@($recoveryResults | Where-Object { $_ -eq 'reconciled' }).Count -ne 1 -or
      @($recoveryResults | Where-Object { $_ -eq 'already_reconciled' }).Count -ne 5) {
    throw 'Concurrent recovery did not reconcile exactly once'
  }
  [void](Invoke-PromotionQuery $promotionFixture @'
DO $$ BEGIN
 IF (SELECT count(*) FROM private.promotion_expired_attempts)<>1
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE attempt_number<>1 OR stripe_session_id IS NOT NULL OR included_credits<>0) THEN
  RAISE EXCEPTION 'Concurrent recovery reset history or credits'; END IF;
END $$;
'@)
  # Concurrent completion uses one fixed fixture timestamp, not retry time.
  [void](Invoke-PromotionQuery $promotionFixture @'
UPDATE private.promotion_redemptions SET stripe_session_id='cs_completefixture',original_trial_ends_at=now()+interval '7 days',completed_at=now();
'@)
  $completion = @'
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
SELECT public.record_verified_promotion_completion(jsonb_build_object(
 'reservation_id',id,'session_id','cs_completefixture','currency','AUD','livemode',true,
 'amount_subtotal_cents',19900,'discount_cents',10149,'amount_total_cents',10726,
 'payment_intent_id','pi_completefixture','payment_status','paid','completion_event_id','evt_completefixture',
 'completed_at',completed_at))->>'result' FROM private.promotion_redemptions;
COMMIT;
'@
  $completionWorkers = @(1..6 | ForEach-Object { Start-PromotionQuery $promotionFixture $completion })
  $completionResults = @($completionWorkers | ForEach-Object { Complete-PromotionQuery $_ })
  if (@($completionResults | Where-Object { $_ -eq 'recorded' }).Count -ne 1 -or
      @($completionResults | Where-Object { $_ -eq 'already_recorded' }).Count -ne 5) {
    throw 'Concurrent completion did not record exactly once'
  }
  $changedCompletion = Complete-PromotionQuery (Start-PromotionQuery $promotionFixture ($completion.Replace('10726','10727'))) $true
  if ($changedCompletion -notmatch 'replay evidence changed') { throw 'Changed completion replay was not rejected' }
  [void](Invoke-PromotionQuery $promotionFixture @'
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('33333333-3333-4333-8333-333333333333','no-cost@example.test',now());
INSERT INTO public.account_members(account_owner_id,member_user_id,role,accepted_at)
 VALUES('33333333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333333','master',now());
INSERT INTO public.promotion_campaigns(code,campaign_name,percent_off,created_by)
 VALUES('FREE100','Disposable no-cost test',100,'33333333-3333-4333-8333-333333333333');
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
DO $$ DECLARE reservation uuid; evidence jsonb; BEGIN
 reservation:=(public.reserve_first_purchase_promotion('33333333-3333-4333-8333-333333333333','FREE100','essential')->>'id')::uuid;
 UPDATE private.promotion_redemptions SET stripe_session_id='cs_freefixture',stripe_customer_id='cus_freefixture',
 livemode=true,original_trial_ends_at=now()+interval '7 days' WHERE id=reservation;
 evidence:=jsonb_build_object('reservation_id',reservation,'session_id','cs_freefixture','currency','AUD','livemode',true,
 'amount_subtotal_cents',19900,'discount_cents',19900,'amount_total_cents',0,'payment_status','no_payment_required',
 'completion_event_id','evt_freefixture','completed_at',now());
 BEGIN
  PERFORM public.record_verified_promotion_completion(evidence||jsonb_build_object('payment_intent_id','pi_inventedfixture'));
  RAISE EXCEPTION 'No-cost payment reference incorrectly accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='No-cost payment reference incorrectly accepted' THEN RAISE; END IF; END;
 PERFORM public.record_verified_promotion_completion(evidence);
 IF NOT EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE id=reservation AND state='completed'
 AND stripe_payment_intent_id IS NULL AND amount_total_cents=0 AND included_credits=0) THEN
  RAISE EXCEPTION 'No-cost completion state mismatch'; END IF;
END $$;
COMMIT;
'@)
  # Durable email-use history must survive auth deletion and re-registration.
  [void](Invoke-PromotionQuery $promotionFixture @'
DELETE FROM auth.users WHERE id='11111111-1111-4111-8111-111111111111';
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('22222222-2222-4222-8222-222222222222','concurrency@example.test',now());
INSERT INTO public.account_members(account_owner_id,member_user_id,role,accepted_at)
 VALUES('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','master',now());
DO $$ BEGIN IF (SELECT count(*) FROM private.promotion_redemptions)<>2 THEN RAISE EXCEPTION 'Email history lost on auth deletion'; END IF; END $$;
'@)
  $reuse = Complete-PromotionQuery (Start-PromotionQuery $promotionFixture ($reserve.Replace('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'))) $true
  if ($reuse -notmatch 'first package purchase') { throw 'Re-registered email reuse was not denied at first-purchase boundary' }
  Write-Output 'PASS: eight concurrent reservations share one identity; zero-credit offer remains pinned; package substitution is rejected; account-return contention and retry work; six concurrent expiry recoveries reconcile once; six concurrent completions record once; changed replay is rejected; genuine no-cost evidence passes and invented payment is rejected; re-registration cannot reset completed email use.'
} finally {
  if ($promotionCreated) {
    # Only the uniquely named database created by this run is eligible for removal.
    if ($promotionFixture -notmatch '^ww_promo_concurrency_[0-9a-f]{12}$') { throw 'Cleanup scope guard failed' }
    [void](Invoke-PromotionQuery 'admin_activity_validation_final' "DROP DATABASE $promotionFixture;")
    Write-Output 'Disposable local concurrency database removed; source fixture database preserved.'
  }
}
