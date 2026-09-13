import { describe, expect, it } from 'vitest';
import { parsePromotionStripePayment, parsePromotionStripeSession } from '../../supabase/functions/_shared/promotionStripeEvidence';
describe('retrieved Stripe promotion evidence', () => {
  const stored = { id: 'reservation', userId: 'user', plan: 'essential' as const, percent: 50, couponId: 'coupon_fixture',
    customerId: 'cus_fixture', productId: 'prod_fixture', sessionId: 'cs_fixture', livemode: false, originalTrialEndsAt: '', createdAt: '', completionEventId: null };
  const coupon = { id: 'coupon_fixture', percent_off: 50, amount_off: null, applies_to: { products: ['prod_fixture'] } };
  const session = { id: 'cs_fixture', customer: 'cus_fixture', livemode: false, mode: 'payment', status: 'complete',
    payment_status: 'paid', currency: 'aud', amount_subtotal: 19900, amount_total: 10945, payment_intent: 'pi_fixture',
    total_details: { amount_discount: 9950 }, metadata: { purchase_consent: 'explicit-v1', plan_purchase_purpose: 'new_plan',
      promotion_reservation_id: 'reservation', user_id: 'user', plan_type: 'essential' } };
  const line = { quantity: 1, price: { currency: 'aud', recurring: null, tax_behavior: 'exclusive', product: 'prod_fixture' },
    amount_subtotal: 19900, amount_discount: 9950, discounts: [{ amount: 9950, discount: { source: { type: 'coupon', coupon } } }] };
  const lines = { has_more: false, data: [line] };
  it('reads the current expanded coupon source', () => expect(parsePromotionStripeSession(session, lines, stored).couponId).toBe('coupon_fixture'));
  it('reads the existing legacy expanded coupon shape explicitly', () => expect(parsePromotionStripeSession(session, { ...lines, data: [{ ...line, discounts: [{ amount: 9950, discount: { coupon } }] }] }, stored).couponId).toBe('coupon_fixture'));
  it('rejects extra undisclosed items', () => expect(() => parsePromotionStripeSession(session, { ...lines, data: [line, line] }, stored)).toThrow());
  it('rejects incomplete pagination', () => expect(() => parsePromotionStripeSession(session, { ...lines, has_more: true }, stored)).toThrow());
  it('rejects amount-only discounts', () => expect(() => parsePromotionStripeSession(session, { ...lines, data: [{ ...line, discounts: [{ amount: 9950, discount: { coupon: { ...coupon, amount_off: 9950 } } }] }] }, stored)).toThrow());
  it('rejects coupon substitution even when the percentage matches', () => expect(() => parsePromotionStripeSession(session, { ...lines, data: [{ ...line, discounts: [{ amount: 9950, discount: { coupon: { ...coupon, applies_to: { products: ['other'] } } } }] }] }, stored)).toThrow());
  it('rejects unexpanded discount references', () => expect(() => parsePromotionStripeSession(session, { ...lines, data: [{ ...line, discounts: [{ amount: 9950, discount: 'di_fixture' }] }] }, stored)).toThrow());
  const intent = { id: 'pi_fixture', customer: 'cus_fixture', livemode: false, status: 'succeeded', currency: 'aud', amount_received: 10945,
    latest_charge: { id: 'ch_fixture', payment_intent: 'pi_fixture', customer: 'cus_fixture', currency: 'aud', livemode: false, amount: 10945,
      captured: true, paid: true, refunded: false, amount_refunded: 0, disputed: false } };
  it('reads captured payment evidence without creating charges', () => expect(parsePromotionStripePayment(intent).captured).toBe(true));
  it('rejects a charge from another customer', () => expect(() => parsePromotionStripePayment({ ...intent, latest_charge: { ...intent.latest_charge, customer: 'cus_other' } })).toThrow());
  it('flags partial refunds', () => expect(parsePromotionStripePayment({ ...intent, latest_charge: { ...intent.latest_charge, amount_refunded: 1 } }).refunded).toBe(true));
});
