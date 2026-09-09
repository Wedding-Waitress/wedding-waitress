import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260908232000_guest_addition_notifications.sql', 'utf8');
const rollback = readFileSync('supabase/rollback/20260908232000_guest_addition_notifications.rollback.sql', 'utf8');
const deliveryMigration = readFileSync('supabase/migrations/20260909015000_guest_addition_email_delivery_claim.sql', 'utf8');
const deliveryRollback = readFileSync('supabase/rollback/20260909015000_guest_addition_email_delivery_claim.rollback.sql', 'utf8');
const smsMigration = readFileSync('supabase/migrations/20260909020000_guest_addition_sms_notifications.sql', 'utf8');
const smsRollback = readFileSync('supabase/rollback/20260909020000_guest_addition_sms_notifications.rollback.sql', 'utf8');
const schedulerMigration = readFileSync('supabase/migrations/20260909023000_guest_addition_notification_scheduler.sql', 'utf8');
const schedulerRollback = readFileSync('supabase/rollback/20260909023000_guest_addition_notification_scheduler.rollback.sql', 'utf8');
const guestList = readFileSync('src/components/Dashboard/GuestListTable.tsx', 'utf8');
const processor = readFileSync('supabase/functions/process-guest-addition-notifications/index.ts', 'utf8');
const platformSms = readFileSync('supabase/functions/_shared/platformSms.ts', 'utf8');
const smsEnrolment = readFileSync('supabase/functions/guest-addition-sms-enrolment/index.ts', 'utf8');
const smsDialog = readFileSync('src/components/Dashboard/GuestAdditionSmsVerificationDialog.tsx', 'utf8');
const supabaseConfig = readFileSync('supabase/config.toml', 'utf8');
const signup = readFileSync('src/components/auth/SignUpModal.tsx', 'utf8');
const embeddedSignup = readFileSync('src/components/auth/EmbeddedSignUpForm.tsx', 'utf8');
const guestListCss = readFileSync('src/components/Dashboard/GuestListTable.module.css', 'utf8');

describe('guest-added organiser notification contract', () => {
  it('captures only committed public add_guest logs and deduplicates per event/new guest', () => {
    expect(migration).toContain("new.changed_by is distinct from 'public_live_view'");
    expect(migration).toContain("new.payload->>'action' is distinct from 'add_guest'");
    expect(migration).toContain('choice is null');
    expect(migration).toContain('unique (event_id, guest_id)');
    expect(migration).toContain('on conflict (event_id, guest_id) do nothing');
    expect(migration).toContain("group_choice in ('separate', 'group')");
    expect(migration).toContain('referrer_id := added_guest.added_by_guest_id');
    expect(migration).toContain('revoke insert on public.guest_update_logs from anon');
  });

  it('backfills attributable additions without retroactive email and has a matching rollback', () => {
    expect(migration).toContain("'not_requested', l.created_at");
    expect(migration).toContain('join public.guests referrer');
    expect(migration).toContain('email_enabled boolean not null default false');
    expect(migration).toContain('), false);');
    expect(deliveryMigration).toContain('p.email_enabled = true');
    expect(deliveryMigration).toContain("email_status = 'disabled'");
    expect(rollback).toContain('drop table if exists public.guest_addition_notifications');
    expect(rollback).toContain('drop table if exists public.guest_addition_notification_preferences');
  });

  it('keeps review owner-authorized and isolated from guest RSVP, seating and groups', () => {
    const reviewFunction = migration.slice(migration.indexOf('create or replace function public.mark_guest_addition_reviewed'), migration.indexOf('create or replace function public.set_guest_addition_email_preference'));
    expect(reviewFunction).toContain('public.can_access_event');
    expect(reviewFunction).toContain('reviewed_at');
    expect(reviewFunction).not.toMatch(/update\s+public\.guests/i);
    expect(reviewFunction).not.toMatch(/rsvp|seat|family_group/i);
    expect(migration).toContain('revoke all on function public.mark_guest_addition_reviewed(uuid, uuid) from public, anon');
  });

  it('renders separate/group attribution, persistent row badge and direct row navigation', () => {
    expect(guestList).toContain("item.group_choice === 'group' ? 'part of their group' : 'a separate guest'");
    expect(guestList).toContain('New — added by guest');
    expect(guestList).toContain('data-guest-id={guest.id}');
    expect(guestList).toContain('revealGuestAddition(item.guest_id, item.added_guest_name)');
    expect(guestList).toContain("searchParams.get('guest')");
  });

  it('uses Resend for future opted-in alerts with an atomic claim and stable provider dedupe', () => {
    expect(processor).toContain("Deno.env.get('GUEST_ADDITION_PROCESSOR_SECRET')");
    expect(processor).toContain("req.headers.get('x-guest-addition-processor-secret') !== processorSecret");
    expect(processor).toContain("Deno.env.get('RESEND_API_KEY')");
    expect(processor).toContain("fetch('https://api.resend.com/emails'");
    expect(processor).toContain("'Idempotency-Key': idempotencyKey");
    expect(processor).toContain("from: 'Wedding Waitress <support@weddingwaitress.com.au>'");
    expect(processor).toContain("to: [owner.user.email]");
    expect(processor).toContain("email_status: 'queued'");
    expect(processor).not.toContain("email_status: 'sent'");
    expect(processor).not.toContain('send-transactional-email');
    expect(processor).not.toContain('guest.email');
    expect(processor).not.toMatch(/stripe|billing|credit/i);
    expect(deliveryMigration).toContain("email_status = 'processing'");
    expect(deliveryMigration).toContain('for update of n skip locked');
    expect(deliveryMigration).toContain('p.email_enabled = true');
    expect(deliveryMigration).toContain('grant execute on function public.claim_guest_addition_email_notifications(integer)');
    expect(deliveryRollback).toContain('drop function if exists public.claim_guest_addition_email_notifications(integer)');
  });

  it('keeps organiser SMS separate, verified-owner-only, platform-paid and atomically claimed', () => {
    expect(guestList).toContain('Receive free new guest added email alerts');
    expect(guestList).toContain('Receive free new guest added SMS alerts');
    expect(guestList).toContain('mt-2 flex min-w-0 flex-col gap-2');
    expect(guestList).toContain('<Mail size={15} strokeWidth={1.8}');
    expect(guestList).toContain('aria-hidden="true">SMS</span>');
    expect(guestList).not.toContain('<Smartphone');
    expect(guestList).toContain('className="min-w-0 flex-1"');
    expect(guestList).toContain('className="shrink-0" checked={guestAdditionState.smsEnabled}');
    expect(guestList).toContain('Verification is required when you turn this on.');
    expect(guestList).toContain('setShowSmsVerification(true)');
    expect(guestList).toContain('guestAdditionState.smsEligible');
    expect(guestList).toContain('guestAdditionState.setSmsPreference');
    expect(smsMigration).toContain('sms_enabled boolean not null default false');
    expect(smsMigration).toContain('create table if not exists public.organiser_phone_verifications');
    expect(smsMigration).toContain('create table if not exists public.organiser_phone_otp_challenges');
    expect(smsMigration).toContain('profiles_invalidate_organiser_phone_verification');
    expect(smsMigration).toContain('set sms_enabled = false');
    expect(smsMigration).toContain("sms_status = 'processing'");
    expect(smsMigration).toContain('for update of n skip locked');
    expect(smsMigration).toContain("'not_requested'");
    expect(smsMigration).toContain('to service_role');
    expect(processor).toContain("from('organiser_phone_verifications')");
    expect(processor).toContain(".eq('user_id', event.user_id)");
    expect(processor).toContain("sms_status: 'queued'");
    expect(processor).not.toContain("sms_status: 'delivered'");
    expect(platformSms).toContain('TWILIO_ACCOUNT_SID');
    expect(platformSms).toContain('TWILIO_MESSAGING_SERVICE_SID');
    expect(platformSms).not.toMatch(/consume_sms_credit|get_sms_credits|credit_transactions|create-checkout/i);
    expect(smsRollback).toContain('drop function if exists public.claim_guest_addition_sms_notifications(integer)');
  });

  it('enrols the saved signup mobile with a dedicated, rate-limited owner OTP flow', () => {
    expect(signup).toContain('mobile: formData.mobile.trim()');
    expect(embeddedSignup).toContain('mobile: formData.mobile || null');
    expect(smsDialog).toContain("action: 'status'");
    expect(smsDialog).toContain("action: 'request'");
    expect(smsDialog).toContain("action: 'verify'");
    expect(smsDialog).toContain('Verify and enable SMS alerts');
    expect(smsDialog).toContain('SMS verification is not active in this environment yet.');
    expect(smsDialog).not.toMatch(/Twilio account|accepted for delivery/i);
    expect(guestList).toContain('guestAdditionState.setSmsPreference(true)');
    expect(smsEnrolment).toContain('const isOwner = event.user_id === userId');
    expect(smsEnrolment).toContain('Only the event owner can verify or change');
    expect(smsEnrolment).toContain("from('profiles').select('mobile')");
    expect(smsEnrolment).toContain("defaultCountry: 'AU'");
    expect(smsEnrolment).toContain("rpc('reserve_organiser_phone_otp_challenge'");
    expect(smsMigration).toContain('pg_advisory_xact_lock');
    expect(smsMigration).toContain(") >= 5");
    expect(smsMigration).toContain(") >= 10");
    expect(smsMigration).toContain("interval '1 minute'");
    expect(smsEnrolment).toContain('challenge.attempts >= 5');
    expect(smsEnrolment).toContain("`${code}|${userId}|${phone}|${serviceKey}`");
    expect(smsEnrolment).toContain('Wedding Waitress verification code:');
    expect(smsEnrolment).not.toMatch(/admin_otp_codes|ww_admin_grant|consume_sms_credit|get_sms_credits/i);
    expect(supabaseConfig).toMatch(/\[functions\.guest-addition-sms-enrolment\]\s*verify_jwt = true/);
  });

  it('uses the approved left-expanding SMS plus email pill without changing the table column', () => {
    expect(guestList).toContain('title="Send via SMS or email"');
    expect(guestList).toMatch(/<span>SMS<\/span><span>\+<\/span><Mail size=\{15\}/);
    expect(guestListCss).toMatch(/ww-guest-select-checkbox[\s\S]*width: 3\.5rem !important;[\s\S]*transform: translateX\(-0\.75rem\)/);
    expect(guestList).toContain("<col style={{ width: '7%' }} />");
  });

  it('prepares automatic processing without exposing the service credential to the browser', () => {
    expect(schedulerMigration).toContain("'*/2 * * * *'");
    expect(schedulerMigration).toContain("/functions/v1/process-guest-addition-notifications");
    expect(schedulerMigration).toContain("from vault.decrypted_secrets");
    expect(schedulerMigration).toContain("where name = 'guest_addition_processor_gateway_key'");
    expect(schedulerMigration).toContain("where name = 'guest_addition_processor_secret'");
    expect(schedulerMigration).toContain("'x-guest-addition-processor-secret'");
    expect(schedulerMigration).toContain('timeout_milliseconds := 30000');
    expect(schedulerMigration).not.toContain('service_role_key');
    expect(schedulerMigration).toContain("'Authorization', 'Bearer '");
    expect(schedulerRollback).toContain("cron.unschedule('process-guest-addition-notifications')");
    expect(schedulerMigration).toContain("cron.schedule(\n  'cleanup-organiser-phone-otp-challenges'");
    expect(schedulerMigration).toContain("created_at < now() - interval '24 hours'");
    expect(guestList).not.toContain('service_role_key');
    expect(smsDialog).not.toContain('service_role_key');
  });
});
