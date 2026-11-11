import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260909213000_prepaid_access_extensions_and_expiry_reminders.sql', 'utf8');
const rollback = fs.readFileSync('supabase/rollbacks/20260909213000_prepaid_access_extensions_and_expiry_reminders.rollback.sql', 'utf8');
const checkout = fs.readFileSync('supabase/functions/create-extension-checkout/index.ts', 'utf8');
const verify = fs.readFileSync('supabase/functions/verify-payment/index.ts', 'utf8');
const webhook = fs.readFileSync('supabase/functions/stripe-access-extension-webhook/index.ts', 'utf8');
const reminder = fs.readFileSync('supabase/functions/process-access-expiry-reminders/index.ts', 'utf8');
const cleanup = fs.readFileSync('supabase/functions/purge-expired-access-accounts/index.ts', 'utf8');
const extensionRules = fs.readFileSync('supabase/functions/_shared/accessExtensionRules.ts', 'utf8');

describe('paid access lifecycle release contract', () => {
  it('ends all planning and download access at paid expiry', () => {
    expect(migration).toContain("else 'expired' end");
    expect(migration).toContain('is_read_only = now() > us.expires_at');
    expect(migration).toContain('download_only_ends_at = null');
    expect(migration).toContain('now() <= us.expires_at');
    expect(migration).toContain('public.is_account_operational');
    expect(migration).not.toContain("then 'grace_period'");
  });

  it('preserves historical migration evidence but disables automatic deletion on access expiry', () => {
    expect(migration).toContain("access_recovery_ends_at = expires_at + interval '6 months'");
    expect(migration).toContain("next_expiry + interval '6 months'");
    expect(migration).toContain('for update of us');
    expect(migration).toContain("j.status='processing'");
    expect(migration).toContain('prepare_expired_access_purge');
    expect(cleanup).toContain('disabled: true');
    expect(cleanup).not.toContain('.rpc(');
    expect(cleanup).not.toContain('.remove(');
    expect(cleanup).not.toContain('createClient');
  });

  it('prices every positive whole month authoritatively at A$20 and rejects client prices', () => {
    expect(extensionRules).toContain('ACCESS_EXTENSION_MONTH_PRICE_CENTS = 2_000');
    expect(extensionRules).toContain('Number.isSafeInteger(months)');
    expect(checkout).toContain("from '../_shared/accessExtensionRules.ts'");
    expect(checkout).toContain('Client-supplied prices are not accepted.');
    expect(checkout).toContain('price: ACCESS_EXTENSION_LIVE_PRICE_ID');
    expect(checkout).toContain('quantity: months');
    expect(checkout).toContain('retrieveWorldwideGstRate');
    expect(checkout).toContain('mode: "payment"');
    expect(checkout).not.toContain('mode: "subscription"');
    expect(verify).toContain('validatePaidAccessExtension');
    expect(webhook).toContain('validatePaidAccessExtension');
  });

  it('fulfills once per Stripe session through return verification and a signed webhook', () => {
    expect(migration).toContain('stripe_session_id text not null unique');
    expect(migration).toContain("'already_fulfilled'::text");
    expect(verify).toContain('fulfill_access_extension');
    expect(webhook).toContain('constructEventAsync');
    expect(webhook).toContain('STRIPE_ACCESS_EXTENSION_WEBHOOK_SECRET');
    expect(webhook).toContain('fulfill_access_extension');
  });

  it('creates one email and one SMS reminder for the current expiry exactly 30 days out', () => {
    expect(migration).toContain("cross join (values ('email'),('sms'))");
    expect(migration).toContain("interval '29 days 23 hours'");
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain('unique (user_id, expires_at, channel)');
    expect(migration).toContain("status = 'stale'");
    expect(reminder).toContain('buildAccessExpiryEmail');
    expect(reminder).toContain('buildAccessExpirySms');
    expect(reminder).toContain("'Idempotency-Key'");
  });

  it('includes a rollback and does not activate any scheduler in the lifecycle migration itself', () => {
    expect(rollback).toContain('drop table if exists public.access_extension_purchases');
    expect(rollback).toContain('drop table if exists public.access_expiry_reminders');
    expect(rollback).toContain('drop table if exists public.access_recovery_cleanup_jobs');
    expect(rollback).toContain('drop column if exists access_recovery_ends_at');
    expect(migration).not.toContain("cron.schedule(");
  });
});
