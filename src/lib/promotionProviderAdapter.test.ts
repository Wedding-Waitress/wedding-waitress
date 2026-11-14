import { expect, it, vi } from 'vitest';
import { promotionProviderAdapter } from '../../supabase/functions/_shared/promotionProviderAdapter';

const storedCheckout = { id: 'reservation', account_user_id: 'user', plan_key: 'essential', percent_off: 50,
  stripe_coupon_id: 'coupon_fixture', stripe_customer_id: 'cus_fixture', stripe_product_id: 'prod_fixture',
  stripe_session_id: 'cs_fixture', livemode: false };
const recordedSession = { id: 'cs_fixture', customer: 'cus_fixture', livemode: false, mode: 'payment', status: 'open',
  payment_status: 'unpaid', currency: 'aud', amount_subtotal: 19900, amount_total: 10945, payment_intent: null,
  total_details: { amount_discount: 9950 }, metadata: { purchase_consent: 'explicit-v1', plan_purchase_purpose: 'new_plan',
    promotion_reservation_id: 'reservation', user_id: 'user', plan_type: 'essential' } };
const reservation = { id: 'reservation', plan_key: 'essential' as const, percent_off: 50, included_credits: 150, stripe_session_id: 'cs_fixture' };
const recordedLine = { quantity: 1, price: { currency: 'aud', recurring: null, tax_behavior: 'exclusive', product: 'prod_fixture' },
  amount_subtotal: 19900, amount_discount: 9950, discounts: [{ amount: 9950, discount: { source: { type: 'coupon', coupon: 'coupon_fixture' } } }] };
function recordedFixture() {
  const db = { rpc: vi.fn().mockResolvedValue({ data: storedCheckout, error: null }) };
  const stripe = { checkout: { sessions: { listLineItems: vi.fn().mockImplementation(async () => ({ has_more: false, data: [structuredClone(recordedLine)] })) } },
    coupons: { retrieve: vi.fn().mockResolvedValue({ id: 'coupon_fixture', percent_off: 50, applies_to: { products: ['prod_fixture'] } }) } };
  return { db, stripe, adapter: promotionProviderAdapter(db, stripe, false) };
}
it('checks the stored binding and expanded package before reopening', async () => {
  const { db, stripe, adapter } = recordedFixture();
  await expect(adapter.verifyRecordedSession(recordedSession, reservation, 'user')).resolves.toBeUndefined();
  expect(db.rpc).toHaveBeenCalledWith('promotion_checkout_context', { p_session: 'cs_fixture' });
  expect(stripe.coupons.retrieve).toHaveBeenCalledWith('coupon_fixture', { expand: ['applies_to'] });
});
it.each([{ customer: 'cus_other' }, { currency: 'usd' }, { amount_total: 9949 }, { amount_total: 9950 }, { amount_total: 10946 }, { mode: 'subscription' }])(
  'rejects substituted reopened checkout evidence: %j', async (change) => {
    const { adapter } = recordedFixture();
    await expect(adapter.verifyRecordedSession({ ...recordedSession, ...change }, reservation, 'user')).rejects.toThrow();
  });
it('rejects another coupon even when its percentage is identical', async () => {
  const { stripe, adapter } = recordedFixture();
  stripe.coupons.retrieve.mockResolvedValue({ id: 'coupon_other', percent_off: 50, applies_to: { products: ['prod_fixture'] } });
  await expect(adapter.verifyRecordedSession(recordedSession, reservation, 'user')).rejects.toThrow('binding');
});
it('stops before provider reads when recorded binding is missing', async () => {
  const { db, stripe, adapter } = recordedFixture();
  db.rpc.mockResolvedValue({ data: null, error: null });
  await expect(adapter.verifyRecordedSession(recordedSession, reservation, 'user')).rejects.toThrow('binding');
  expect(stripe.checkout.sessions.listLineItems).not.toHaveBeenCalled();
});

it('uses a persisted customer without searching or creating another', async () => {
  const db = { rpc: vi.fn().mockResolvedValue({ data: 'cus_stored', error: null }) };
  const stripe = { customers: { create: vi.fn(), retrieve: vi.fn().mockResolvedValue({ object: 'customer', id: 'cus_stored', livemode: false, tax_exempt: 'none', metadata: { wedding_waitress_user_id: 'user' } }) } };
  const adapter = promotionProviderAdapter(db, stripe, false);
  expect(await adapter.ensureCustomer('user', 'verified@example.test')).toBe('cus_stored');
  expect(stripe.customers.create).not.toHaveBeenCalled();
});

it('fails closed before provider work when the database binding is unavailable', async () => {
  const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'Unavailable' } }) };
  const stripe = { customers: { create: vi.fn() } };
  await expect(promotionProviderAdapter(db, stripe, false).ensureCustomer('user', 'verified@example.test')).rejects.toThrow('could not be confirmed');
  expect(stripe.customers.create).not.toHaveBeenCalled();
});

it('does not create a replacement coupon after an uncertain provider lookup', async () => {
  const stripe = { coupons: { retrieve: vi.fn().mockRejectedValue({ code: 'api_connection_error' }), create: vi.fn() } };
  await expect(promotionProviderAdapter({}, stripe, false).ensureCoupon('coupon', 50, 'product')).rejects.toThrow('could not be confirmed');
  expect(stripe.coupons.create).not.toHaveBeenCalled();
});

it('rejects a retrieved coupon with the wrong percentage', async () => {
  const stripe = { coupons: { retrieve: vi.fn().mockResolvedValue({ id: 'coupon', percent_off: 51, valid: true, applies_to: { products: ['product'] } }) } };
  await expect(promotionProviderAdapter({}, stripe, false).ensureCoupon('coupon', 50, 'product')).rejects.toThrow('does not match');
});

it('requires complete provider pagination instead of accepting partial completion evidence', async () => {
  const db = { rpc: vi.fn().mockResolvedValue({ data: { id: 'reservation', created_at: '2026-09-13T00:00:00.500Z' }, error: null }) };
  const stripe = { events: { list: vi.fn().mockResolvedValue({ data: [], has_more: true }) } };
  const adapter = promotionProviderAdapter(db, stripe, false);
  await adapter.lookupCheckout('cs_fixture');
  await expect(adapter.findOriginalCompletion('cs_fixture', null)).rejects.toThrow('pagination is inconsistent');
  expect(stripe.events.list).toHaveBeenCalledWith(expect.objectContaining({ created: { gte: 1789257600 } }));
});

it('uses delayed payment success time instead of the earlier unpaid completion', async () => {
  const event = (id: string, type: string, status: string, created: number) => ({ id, type, livemode: false, created,
    data: { object: { id: 'cs_fixture', payment_status: status } } });
  const pending = event('evt_pending', 'checkout.session.completed', 'unpaid', 1789257601);
  const paid = event('evt_paid', 'checkout.session.async_payment_succeeded', 'paid', 1789257700);
  const db = { rpc: vi.fn().mockResolvedValue({ data: { ...storedCheckout, created_at: '2026-09-13T00:00:00Z' }, error: null }) };
  const stripe = { events: { list: vi.fn().mockResolvedValue({ data: [paid, pending], has_more: false }) } };
  const adapter = promotionProviderAdapter(db, stripe, false);
  await adapter.lookupCheckout('cs_fixture');
  expect(await adapter.findOriginalCompletion('cs_fixture', null)).toMatchObject({ id: 'evt_paid', type: 'checkout.session.async_payment_succeeded', createdAt: new Date(paid.created * 1000).toISOString() });
  stripe.events.list.mockResolvedValue({ data: [pending], has_more: false });
  await expect(adapter.findOriginalCompletion('cs_fixture', null)).rejects.toThrow('successful provider completion');
});

it('explicitly retrieves package restrictions when Stripe omits them by default', async () => {
  const retrieve = vi.fn(async (_id: string, options?: { expand: string[] }) => ({
    id: 'coupon', percent_off: 50, amount_off: null, valid: true,
    ...(options?.expand.includes('applies_to') ? { applies_to: { products: ['product'] } } : {}),
  }));
  await expect(promotionProviderAdapter({}, { coupons: { retrieve } }, false)
    .ensureCoupon('coupon', 50, 'product')).resolves.toBe('coupon');
  expect(retrieve).toHaveBeenCalledWith('coupon', { expand: ['applies_to'] });
});
it('requests package restrictions when creating the first reserved coupon', async () => {
  const create = vi.fn(async (parameters: any) => ({ id: parameters.id, percent_off: parameters.percent_off,
    valid: true, ...(parameters.expand?.includes('applies_to') ? { applies_to: parameters.applies_to } : {}) }));
  const retrieve = vi.fn().mockRejectedValue({ code: 'resource_missing' });
  await expect(promotionProviderAdapter({}, { coupons: { retrieve, create } }, false)
    .ensureCoupon('new_coupon', 50, 'product')).resolves.toBe('new_coupon');
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ expand: ['applies_to'],
    applies_to: { products: ['product'] } }), expect.any(Object));
});