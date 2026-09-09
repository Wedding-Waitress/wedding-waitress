import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkout = readFileSync('supabase/functions/create-checkout/index.ts', 'utf8');
const verification = readFileSync('supabase/functions/verify-payment/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260909153000_guest_capacity_topups.sql', 'utf8');
const modal = readFileSync('src/components/Dashboard/RsvpOverageModal.tsx', 'utf8');

describe('guest capacity checkout contract', () => {
  it('prices only whole blocks of ten at A$10 with a bounded server quantity', () => {
    expect(checkout).toContain("purchase_type === 'guest_capacity_topup'");
    expect(checkout).toContain('!Number.isInteger(quantity)');
    expect(checkout).toContain('lineQuantity > 100');
    expect(checkout).toContain("resolvedPrice.unit_amount !== 1000");
    expect(checkout).toContain("resolvedPrice.currency !== 'aud'");
    expect(modal).toContain('How many blocks of 10 guest spaces');
    expect(modal).toContain('Resulting guest capacity');
  });

  it('fulfills only a paid exact-price session and rejects amount or quantity substitution', () => {
    expect(verification).toContain('session.payment_status !== "paid"');
    expect(verification).toContain("lineItem?.price?.id !== configuredPriceId");
    expect(verification).toContain('lineQuantity !== overageBlocks');
    expect(verification).toContain('session.amount_subtotal !== overageBlocks * 1000');
    expect(verification).toContain("session.currency !== 'aud'");
  });

  it('fulfills idempotently and keeps capacity separate from messaging credits', () => {
    expect(migration).toContain('uq_rsvp_invite_purchases_stripe_session');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain("'already_fulfilled'");
    const capacityBranch = verification.slice(
      verification.indexOf('purchaseTypeMeta === "guest_capacity_topup"'),
      verification.indexOf('// ── Legacy RSVP Overage Purchase'),
    );
    expect(capacityBranch).toContain("fulfill_guest_capacity_topup");
    expect(capacityBranch).not.toContain('add_sms_credits');
  });

  it('enforces the resulting allowance for direct database inserts', () => {
    expect(migration).toContain('CREATE TRIGGER guests_enforce_paid_plan_capacity');
    expect(migration).toContain("purchase_type IN ('rsvp_overage', 'guest_capacity_topup')");
    expect(migration).toContain('current_guest_count >= base_capacity + purchased_blocks * 10');
  });
});
