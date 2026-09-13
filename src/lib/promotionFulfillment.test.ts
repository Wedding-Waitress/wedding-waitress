import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fulfillPromotionCheckout, type PromotionFulfillmentDependencies } from '../../supabase/functions/_shared/promotionFulfillment';
describe('verified promotional fulfillment boundary', () => {
  let deps: PromotionFulfillmentDependencies;
  const now = Date.parse('2026-09-15T00:00:00Z');
  const stored = { id: 'reservation-fixture', userId: 'account-fixture', plan: 'essential' as const, percent: 50, couponId: 'coupon-fixture',
    customerId: 'cus_fixture', productId: 'prod_fixture', sessionId: 'cs_fixture', livemode: false,
    originalTrialEndsAt: '2026-09-20T00:00:00Z', createdAt: '2026-09-13T00:00:00Z', completionEventId: null };
  const session = { id: 'cs_fixture', customerId: 'cus_fixture', productId: 'prod_fixture', couponId: 'coupon-fixture',
    reservationId: 'reservation-fixture', userId: 'account-fixture', plan: 'essential' as const, livemode: false,
    mode: 'payment', quantity: 1, status: 'complete', paymentStatus: 'paid', currency: 'aud', subtotalCents: 19900,
    totalCents: 10945, discountCents: 9950, paymentIntentId: 'pi_fixture' };
  beforeEach(() => {
    deps = { lookupCheckout: vi.fn().mockResolvedValue(stored), retrieveSession: vi.fn().mockResolvedValue(session),
      findOriginalCompletion: vi.fn().mockResolvedValue({ id: 'evt_fixture', type: 'checkout.session.completed', sessionId: 'cs_fixture', livemode: false, createdAt: '2026-09-14T00:00:00Z' }),
      retrievePayment: vi.fn().mockResolvedValue({ id: 'pi_fixture', customerId: 'cus_fixture', livemode: false, status: 'succeeded', currency: 'aud', amountReceivedCents: 10945, captured: true, refunded: false, disputed: false }),
      fulfillAtomically: vi.fn().mockResolvedValue({ result: 'fulfilled', startsAt: '2026-09-20T00:00:00Z', expiresAt: '2027-09-20T00:00:00Z' }) };
  });
  it('schedules paid checkout after the original trial and passes immutable evidence', async () => {
    expect(await fulfillPromotionCheckout(deps, 'cs_fixture', now)).toMatchObject({ activation: 'scheduled', includedCredits: 150 });
    expect(deps.fulfillAtomically).toHaveBeenCalledWith(expect.objectContaining({ completionEventId: 'evt_fixture', includedCredits: 150, termStartsAt: '2026-09-20T00:00:00.000Z' }));
  });
  it('never describes an already-expired promotional term as active', async () => {
    expect(await fulfillPromotionCheckout(deps, 'cs_fixture', Date.parse('2028-01-01T00:00:00Z'))).toMatchObject({activation:'expired'});
  });
  it('permits verified 100% no-cost completion without inventing a payment', async () => {
    vi.mocked(deps.lookupCheckout).mockResolvedValue({ ...stored, percent: 100 });
    vi.mocked(deps.retrieveSession).mockResolvedValue({ ...session, discountCents: 19900, totalCents: 0, paymentIntentId: null, paymentStatus: 'no_payment_required' });
    expect(await fulfillPromotionCheckout(deps, 'cs_fixture', now)).toMatchObject({ includedCredits: 0 });
    expect(deps.retrievePayment).not.toHaveBeenCalled();
  });
  it.each([{ userId: 'other' }, { customerId: 'other' }, { productId: 'other' }, { reservationId: 'other' }, { livemode: true }, { quantity: 2 }, { mode: 'subscription' }, { couponId: 'other' }])('refuses unbound session evidence %s', async change => {
    vi.mocked(deps.retrieveSession).mockResolvedValue({ ...session, ...change });
    await expect(fulfillPromotionCheckout(deps, 'cs_fixture', now)).rejects.toThrow(); expect(deps.fulfillAtomically).not.toHaveBeenCalled();
  });
  it('does not invent completion from verification time', async () => {
    vi.mocked(deps.findOriginalCompletion).mockRejectedValue(new Error('event unavailable'));
    await expect(fulfillPromotionCheckout(deps, 'cs_fixture', now)).rejects.toThrow(); expect(deps.fulfillAtomically).not.toHaveBeenCalled();
  });
  it('refuses disputed payments', async () => {
    const payment = await deps.retrievePayment('pi_fixture'); vi.mocked(deps.retrievePayment).mockResolvedValue({ ...payment, disputed: true });
    await expect(fulfillPromotionCheckout(deps, 'cs_fixture', now)).rejects.toThrow(); expect(deps.fulfillAtomically).not.toHaveBeenCalled();
  });
  it('does not pretend database failure activated access', async () => {
    vi.mocked(deps.fulfillAtomically).mockRejectedValue(new Error('database unavailable'));
    await expect(fulfillPromotionCheckout(deps, 'cs_fixture', now)).rejects.toThrow('database unavailable');
  });
  it('refuses a database response granting more than twelve months', async () => {
    vi.mocked(deps.fulfillAtomically).mockResolvedValue({ result: 'fulfilled', startsAt: '2026-09-20T00:00:00Z', expiresAt: '2028-09-20T00:00:00Z' });
    await expect(fulfillPromotionCheckout(deps, 'cs_fixture', now)).rejects.toThrow('No valid promotional access term');
  });
});
