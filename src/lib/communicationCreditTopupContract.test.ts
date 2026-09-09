import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const prices = read('src/lib/stripePrices.ts');
const hook = read('src/hooks/useSmsTopup.ts');
const checkout = read('supabase/functions/create-checkout/index.ts');
const verification = read('supabase/functions/verify-payment/index.ts');
const migration = read('supabase/migrations/20260909163000_communication_credit_pack_fulfillment.sql');
const rollback = read('supabase/rollbacks/20260909163000_communication_credit_pack_fulfillment.rollback.sql');
const guestCapacityMigration = read('supabase/migrations/20260909153000_guest_capacity_topups.sql');

describe('communication credit top-up contract', () => {
  it('defines two distinct pooled packs and sends an explicit allowlisted key', () => {
    expect(prices).toMatch(/credits_10:[\s\S]*price_aud:\s*10[\s\S]*credits:\s*10/);
    expect(prices).toMatch(/credits_100:[\s\S]*price_aud:\s*49[\s\S]*credits:\s*100/);
    expect(hook).toContain('communication_topup_pack: pack');
    expect(checkout).toContain("credits_10: {");
    expect(checkout).toContain("STRIPE_COMMUNICATION_TOPUP_10_PRICE_ID");
    expect(checkout).toContain("STRIPE_COMMUNICATION_TOPUP_10_PRODUCT_ID");
    expect(checkout).toContain("STRIPE_COMMUNICATION_TOPUP_PRICE_ID");
    expect(checkout).toContain("STRIPE_COMMUNICATION_TOPUP_PRODUCT_ID");
    expect(checkout).toContain("Select an approved communication credit pack.");
  });

  it('keeps the A$10 messaging pack separate from A$10 guest capacity', () => {
    expect(checkout).toContain('GUEST_CAPACITY_TOPUP_PRODUCT_ID');
    expect(checkout).toContain('communicationPack!.productSecret');
    expect(checkout).toContain("purchase_type === 'guest_capacity_topup'");
    expect(guestCapacityMigration).toContain("purchase_type IS DISTINCT FROM 'guest_capacity_topup'");
    expect(migration).toContain("purchase_type IS DISTINCT FROM 'communication_topup'");
    expect(migration).not.toContain('fulfill_guest_capacity_topup');
  });

  it('rejects unpaid or invalid Stripe catalogue selections before fulfillment', () => {
    const communicationBranch = verification.slice(
      verification.indexOf('// ── Plan communication-credit top-ups'),
      verification.indexOf('// ── Legacy SMS top-up'),
    );
    expect(verification.indexOf('session.payment_status !== "paid"')).toBeLessThan(
      verification.indexOf("rpc('fulfill_communication_credit_topup'"),
    );
    expect(verification).toContain("lineItem?.price?.id !== configuredPriceId");
    expect(verification).toContain("productId !== configuredProductId");
    expect(verification).toContain("session.amount_total !== pack.unitAmount");
    expect(verification).toContain("lineItem?.quantity !== 1");
    expect(communicationBranch).not.toContain('add_sms_credits');
  });

  it('fulfills exactly once through a service-role-only atomic function', () => {
    expect(migration).toContain("IF _pack_key = 'credits_10'");
    expect(migration).toContain("expected_credits := 10");
    expect(migration).toContain("expected_amount := 10");
    expect(migration).toContain("ELSIF _pack_key = 'credits_100'");
    expect(migration).toContain("expected_credits := 100");
    expect(migration).toContain("expected_amount := 49");
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain("current_setting('request.jwt.claim.role', true)");
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain('ON CONFLICT (user_id, event_id) DO UPDATE');
    expect(rollback).toContain('DROP FUNCTION IF EXISTS public.fulfill_communication_credit_topup');
  });
});
