import { describe, expect, it } from 'vitest';
import { isMinimalConsentedRenewalRequest, isVerifiedClosedRenewalDecision } from '../../supabase/functions/_shared/renewalRecoveryRules';
const request = { plan_type: 'essential', purchase_consent: true, plan_purchase_purpose: 'renewal', pricing_currency: 'AUD', mode: 'payment' };
describe('minimal renewal recovery rules', () => {
  it.each(['essential', 'premium', 'unlimited'])('permits only an explicit request shape for %s, not authorization', plan_type => {
    expect(isMinimalConsentedRenewalRequest({ ...request, plan_type })).toBe(true);
  });
  it.each([{ purchase_consent: false }, { purchase_consent: 'true' }, { plan_type: 'vendor_pro' }, { pricing_currency: 'USD' },
    { plan_purchase_purpose: 'new_plan' }, { plan_purchase_purpose: 'upgrade' }, { upgrade_from_plan: 'essential' },
    { purchase_type: 'communication_topup' }, { event_id: 'foreign' }, { mode: 'subscription' }, { quantity: 0 }, { quantity: 2 }])('rejects unrelated request %j', changes => {
    expect(isMinimalConsentedRenewalRequest({ ...request, ...changes })).toBe(false);
  });
  it('requires an exact verified ordinary-closure decision without an admin hold or remaining access', () => {
    const decision = { account_closed: true, admin_blocked: false, renewal_required: true, can_reopen: false,
      server_now: '2026-09-12T08:00:00Z' };
    expect(isVerifiedClosedRenewalDecision(decision)).toBe(true);
    for (const changes of [{ admin_blocked: true }, { admin_blocked: null }, { account_closed: false },
      { renewal_required: false }, { can_reopen: true }, { server_now: 'invalid' }]) {
      expect(isVerifiedClosedRenewalDecision({ ...decision, ...changes })).toBe(false);
    }
  });
});
