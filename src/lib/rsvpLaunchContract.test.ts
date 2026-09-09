import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const prices = read('src/lib/stripePrices.ts');
const planModal = read('src/components/Dashboard/RsvpAlreadyPaidModal.tsx');
const checkout = read('supabase/functions/create-checkout/index.ts');
const verification = read('supabase/functions/verify-payment/index.ts');
const migration = read('supabase/migrations/20260909141000_plan_communication_credits.sql');
const emailSender = read('supabase/functions/send-rsvp-email/index.ts');

describe('launch RSVP purchase contract', () => {
  it('shows plan usage before sending instead of selling a separate RSVP bundle', () => {
    expect(planModal).toContain('Email &amp; SMS credits included with your plan');
    expect(planModal).toContain('Included</p>');
    expect(planModal).toContain('Used</p>');
    expect(planModal).toContain('Left</p>');
  });

  it('retains the approved A$49 top-up for 100 shared credits', () => {
    expect(prices).toMatch(/credits_100:[\s\S]*price_aud:\s*49[\s\S]*credits:\s*100/);
    expect(checkout).toContain("STRIPE_COMMUNICATION_TOPUP_PRICE_ID");
    expect(verification).toMatch(/credits_100:[\s\S]*credits:\s*100[\s\S]*unitAmount:\s*4900/);
    expect(checkout).toContain("plan_type === 'rsvp' || purchase_type === 'rsvp_overage'");
  });

  it('has no referral-dependent checkout or payment verification behavior', () => {
    expect(checkout).not.toMatch(/referral_reward|referral attribution/i);
    expect(verification).not.toMatch(/referral_reward|record_referral|reverse_referral/i);
  });

  it('enforces the plan allowances and shared consumption server-side', () => {
    expect(migration).toContain('THEN 150');
    expect(migration).toContain('THEN 250');
    expect(migration).toContain('THEN 450');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.add_sms_credits');
    expect(migration).toContain('TO service_role');
    expect(emailSender).toContain("consume_communication_credit");
    expect(emailSender).toContain("status: 402");
  });
});
