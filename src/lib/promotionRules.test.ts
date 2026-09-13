import { describe, expect, it } from 'vitest';
import { normalizePromotionCode, promotionPreview, promotionTermStart, promotionTermEnd, requireFirstPromotionPurchase,
  validatePromotionCompletion, validatePromotionPercent } from '../../supabase/functions/_shared/promotionRules';

describe('promotional offer rules', () => {
  it.each([1, 10, 50, 51, 99, 100])('accepts whole percentage %s', percent => expect(validatePromotionPercent(percent)).toBe(percent));
  it.each([0, 101, -1, 50.5, NaN, Infinity, '50', null])('rejects invalid percentage %s', value => expect(() => validatePromotionPercent(value)).toThrow());
  it('supports manually named campaign codes without case-sensitive aliases', () => expect(normalizePromotionCode('  Venue 50%  ')).toBe('VENUE 50%'));
  it.each(['', '<script>', 'A\nB', 'A'.repeat(65)])('rejects unsafe code %s', code => expect(() => normalizePromotionCode(code)).toThrow());
  it.each(['essential', 'premium', 'unlimited'] as const)('applies exact credit threshold for %s', plan => {
    expect(promotionPreview(plan, 50).includedCredits).toBe({ essential: 150, premium: 250, unlimited: 450 }[plan]);
    expect(promotionPreview(plan, 51).includedCredits).toBe(0);
    expect(promotionPreview(plan, 100).subtotalCents).toBe(0);
  });
  it.each(['renewal', 'upgrade', 'additional_event', 'communication_topup'])('excludes %s', purpose => expect(() => requireFirstPromotionPurchase(purpose, false)).toThrow());
  it('rejects a returning purchaser even for another campaign', () => expect(() => requireFirstPromotionPurchase('new_plan', true)).toThrow());
  it('accepts a first purchase', () => expect(() => requireFirstPromotionPurchase('new_plan', false)).not.toThrow());
  it('starts early purchases after the original trial, not at signup payment', () => expect(promotionTermStart('2026-09-14T00:00:00Z', '2026-09-20T00:00:00Z')).toBe('2026-09-20T00:00:00.000Z'));
  it('never backdates late checkout', () => expect(promotionTermStart('2026-09-21T00:00:00Z', '2026-09-20T00:00:00Z')).toBe('2026-09-21T00:00:00.000Z'));
  it('uses twelve calendar months, clamping leap day rather than adding 365 days', () => expect(promotionTermEnd('2028-02-29T13:30:00Z')).toBe('2029-02-28T13:30:00.000Z'));
  const evidence = { status: 'complete', paymentStatus: 'paid', currency: 'aud', subtotalCents: 19900,
    totalCents: 10945, discountCents: 9950, paymentIntentId: 'pi_fixture', percent: 50,
    plan: 'essential' as const, couponId: 'coupon_fixture', expectedCouponId: 'coupon_fixture' };
  it('requires verified discounted payment', () => expect(validatePromotionCompletion(evidence).includedCredits).toBe(150));
  it.each([{ status: 'open' }, { paymentStatus: 'unpaid' }, { currency: 'USD' }, { totalCents: 1 },
    { discountCents: 0 }, { couponId: 'other' }, { paymentIntentId: null }])('rejects mismatched provider evidence %s', change => expect(() => validatePromotionCompletion({ ...evidence, ...change })).toThrow());
  it('supports actual no-cost checkout without inventing a payment intent', () => expect(validatePromotionCompletion({ ...evidence,
    percent: 100, discountCents: 19900, totalCents: 0, paymentStatus: 'no_payment_required', paymentIntentId: null }).includedCredits).toBe(0));
  it('does not accept unpaid as a no-cost completion', () => expect(() => validatePromotionCompletion({ ...evidence,
    percent: 100, discountCents: 19900, totalCents: 0, paymentStatus: 'unpaid' })).toThrow());
  it('rejects payment evidence attached to a supposedly no-cost checkout', () => expect(() => validatePromotionCompletion({ ...evidence,
    percent: 100, discountCents: 19900, totalCents: 0, paymentStatus: 'no_payment_required' })).toThrow());
});
