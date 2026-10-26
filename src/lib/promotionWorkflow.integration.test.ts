import { describe, expect, it, vi } from 'vitest';
import { createPromotionCheckout, type PromotionCheckoutDependencies } from '../../supabase/functions/_shared/promotionCheckoutService';
import { fulfillPromotionCheckout, type PromotionFulfillmentDependencies, type StoredPromotionCheckout } from '../../supabase/functions/_shared/promotionFulfillment';
import { parsePromotionStripeSession } from '../../supabase/functions/_shared/promotionStripeEvidence';
import { promotionPreview, promotionTermEnd, type PromotionPlan } from '../../supabase/functions/_shared/promotionRules';

/** Combined service fixture, not a running backend or a real Stripe transaction. */
function workflow(plan: PromotionPlan, percent: number, trialEndsAt = '2026-09-20T00:00:00.000Z') {
  const userId = 'user-fixture';
  const completedAt = '2026-09-13T01:00:00.000Z';
  const now = Date.parse('2026-09-13T02:00:00.000Z');
  const quote = promotionPreview(plan, percent);
  const reservation = { id: '11111111-1111-4111-8111-111111111111', plan_key: plan, percent_off: percent,
    included_credits: quote.includedCredits, stripe_session_id: null as string | null };
  let rawSession: any;
  let stored: StoredPromotionCheckout;
  let committed = false;
  const checkout: PromotionCheckoutDependencies = {
    reserve: vi.fn(async () => ({ ...reservation })),
    ensureCustomer: vi.fn(async () => 'cus_fixture'),
    ensureCoupon: vi.fn(async () => 'coupon_fixture'),
    retrieveSession: vi.fn(async () => rawSession),
    verifyRecordedSession: vi.fn(async () => undefined),
    createSession: vi.fn(async (parameters: any) => {
      rawSession = { id: 'cs_fixture', client_secret: 'local-fixture-only', customer: parameters.customer,
        livemode: false, mode: parameters.mode, status: 'open', payment_status: 'unpaid', currency: 'aud',
        metadata: parameters.metadata, payment_intent: null, amount_subtotal: quote.originalCents,
        amount_total: quote.subtotalCents + Math.round(quote.subtotalCents / 10),
        total_details: { amount_discount: quote.discountCents } };
      return rawSession;
    }),
    bind: vi.fn(async (id, sessionId, customerId, productId, couponId, livemode) => {
      reservation.stripe_session_id = sessionId;
      stored = { id, sessionId, userId, plan, percent, customerId, productId, couponId, livemode,
        originalTrialEndsAt: trialEndsAt, createdAt: '2026-09-13T00:00:00.000Z', completionEventId: null };
    }),
  };
  const completion: PromotionFulfillmentDependencies = {
    lookupCheckout: vi.fn(async () => stored),
    retrieveSession: vi.fn(async () => parsePromotionStripeSession(rawSession, { has_more: false, data: [{
      quantity: 1, price: { product: stored.productId, currency: 'aud', tax_behavior: 'exclusive', recurring: null },
      amount_subtotal: quote.originalCents, amount_discount: quote.discountCents,
      discounts: [{ amount: quote.discountCents, discount: { source: { type: 'coupon', coupon: {
        id: stored.couponId, percent_off: percent, applies_to: { products: [stored.productId] },
      } } } }],
    }] }, stored)),
    findOriginalCompletion: vi.fn(async () => ({ id: 'evt_fixture', type: 'checkout.session.completed',
      sessionId: 'cs_fixture', livemode: false, createdAt: completedAt })),
    retrievePayment: vi.fn(async () => ({ id: 'pi_fixture', customerId: 'cus_fixture', livemode: false,
      status: 'succeeded', currency: 'aud', amountReceivedCents: rawSession.amount_total,
      captured: true, refunded: false, disputed: false })),
    fulfillAtomically: vi.fn(async evidence => {
      const result: 'already_fulfilled' | 'fulfilled' = committed ? 'already_fulfilled' : 'fulfilled';
      committed = true;
      return { result, startsAt: evidence.termStartsAt, expiresAt: promotionTermEnd(evidence.termStartsAt) };
    }),
  };
  const input = { userId, verifiedEmail: 'verified@example.test', code: 'VENUE OFFER', plan, consent: true,
    returnOrigin: 'http://localhost:8080', livemode: false, taxRegistrationVerified: true, worldwideGstRateId: 'txr_TestWorldwideGstRate' };
  return { checkout, completion, input, now, quote, trialEndsAt, completedAt,
    complete: () => { rawSession.status = 'complete'; rawSession.payment_status = percent === 100 ? 'no_payment_required' : 'paid';
      rawSession.payment_intent = percent === 100 ? null : 'pi_fixture'; },
    substituteCustomer: () => { rawSession.customer = 'cus_other'; } };
}

describe('combined local promotional workflow fixtures', () => {
  for (const plan of ['essential', 'premium', 'unlimited'] as const) {
    it.each([50, 51, 100])(`${plan}: creation, recorded reuse and completion at %i percent`, async percent => {
      const fixture = workflow(plan, percent);
      const created = await createPromotionCheckout(fixture.checkout, fixture.input);
      expect(created.quote.includedCredits).toBe(percent <= 50 ? fixture.quote.includedCredits : 0);
      await createPromotionCheckout(fixture.checkout, fixture.input);
      expect(fixture.checkout.createSession).toHaveBeenCalledTimes(1);
      expect(fixture.completion.fulfillAtomically).not.toHaveBeenCalled();
      fixture.complete();
      const fulfilled = await fulfillPromotionCheckout(fixture.completion, created.session.id, fixture.now);
      expect(fulfilled.activation).toBe('scheduled');
      expect(fulfilled.startsAt).toBe(fixture.trialEndsAt);
      expect(fulfilled.expiresAt).toBe('2027-09-20T00:00:00.000Z');
      expect(fulfilled.includedCredits).toBe(fixture.quote.includedCredits);
      expect(fixture.completion.retrievePayment).toHaveBeenCalledTimes(percent === 100 ? 0 : 1);
      const replay = await fulfillPromotionCheckout(fixture.completion, created.session.id, fixture.now);
      expect(replay.result).toBe('already_fulfilled');
      expect(replay.startsAt).toBe(fulfilled.startsAt);
    });
  }
  it('does not fulfill an open checkout, including a hundred-percent offer', async () => {
    const fixture = workflow('essential', 100);
    await createPromotionCheckout(fixture.checkout, fixture.input);
    await expect(fulfillPromotionCheckout(fixture.completion, 'cs_fixture', fixture.now)).rejects.toThrow();
    expect(fixture.completion.fulfillAtomically).not.toHaveBeenCalled();
  });
  it('does not grant a completed checkout substituted to another customer', async () => {
    const fixture = workflow('essential', 51);
    await createPromotionCheckout(fixture.checkout, fixture.input);
    fixture.complete(); fixture.substituteCustomer();
    await expect(fulfillPromotionCheckout(fixture.completion, 'cs_fixture', fixture.now)).rejects.toThrow('identity');
    expect(fixture.completion.fulfillAtomically).not.toHaveBeenCalled();
  });
  it('starts a post-trial purchase at original completion, not verification time', async () => {
    const fixture = workflow('premium', 50, '2026-09-12T00:00:00.000Z');
    await createPromotionCheckout(fixture.checkout, fixture.input);
    fixture.complete();
    const result = await fulfillPromotionCheckout(fixture.completion, 'cs_fixture', fixture.now);
    expect(result.activation).toBe('active');
    expect(result.startsAt).toBe(fixture.completedAt);
  });
});
