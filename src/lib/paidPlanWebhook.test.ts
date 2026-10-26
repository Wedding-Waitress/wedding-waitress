import { describe, expect, it, vi } from 'vitest';
import { fulfillPaidPlanWebhook } from '../../supabase/functions/_shared/paidPlanWebhook';
import { PAID_PLAN_CATALOGUE_VERSION } from '../../supabase/functions/_shared/paidPlanFulfillmentEvidence';

// Provider and database fixtures exercise the deployed service and real evidence
// validator. These are contract tests, not a Stripe transaction or database E2E.
function fixture() {
  const user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const session: any = { object: 'checkout.session', id: 'cs_live_Original1', livemode: true,
    mode: 'payment', status: 'complete', payment_status: 'paid', created: 1700000000,
    payment_intent: 'pi_Original1', currency: 'aud', amount_subtotal: 19900, amount_total: 21890,
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 1990 },
    metadata: { user_id: user, plan_type: 'essential', catalogue_version: PAID_PLAN_CATALOGUE_VERSION,
      purchase_consent: 'explicit-v1', plan_purchase_purpose: 'new_plan' },
    line_items: { has_more: false, data: [{ quantity: 1, amount_subtotal: 19900,
      price: { currency: 'aud', unit_amount: 19900, product: 'ww_live_20260914_v2_essential' } }] } };
  const charge = { object: 'charge', id: 'ch_Original1', payment_intent: 'pi_Original1', livemode: true,
    status: 'succeeded', paid: true, captured: true, refunded: false, amount_refunded: 0,
    disputed: false, currency: 'aud', amount: 21890, created: 1700000002 };
  const intent = { object: 'payment_intent', id: 'pi_Original1', livemode: true, status: 'succeeded',
    latest_charge: charge, currency: 'aud', amount: 21890, amount_received: 21890, created: 1700000001 };
  const event = { object: 'event', id: 'evt_Original1', livemode: true, type: 'payment_intent.succeeded',
    created: 1700000400, data: { object: { id: intent.id, status: 'succeeded' } } };
  let ledger: any = null;
  const fulfillment = { result: 'fulfilled', plan_id: '78cdab0d-d81d-4757-b7cc-f210b8b30f47', status: 'active',
    started_at: '2023-11-14T22:20:00.000Z', expires_at: '2024-11-14T22:20:00.000Z' };
  const rpc = vi.fn(async (name: string, evidence: any) => {
    if (name === 'is_account_suspension_blocked') return { data: false, error: null };
    const duplicate = !!ledger;
    ledger = { user_id: evidence._user_id, stripe_session_id: evidence._stripe_session_id,
      stripe_payment_intent_id: evidence._stripe_payment_intent_id, plan_id: evidence._plan_id,
      purpose: evidence._purpose, currency: evidence._currency, catalogue_version: evidence._catalogue_version,
      amount_subtotal_cents: evidence._amount_subtotal_cents, amount_total_cents: evidence._amount_total_cents,
      payment_reference_at: evidence._payment_reference_at };
    return { data: { ...fulfillment, result: duplicate ? 'already_fulfilled' : 'fulfilled' }, error: null };
  });
  const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: ledger, error: null }) };
  const admin = { rpc, from: vi.fn(() => query) };
  const stripe = { paymentIntents: { retrieve: vi.fn(async () => intent) },
    events: { list: vi.fn(async () => ({ data: [event], has_more: false })) } };
  return { session, charge, admin, stripe, rpc };
}

describe('server-verified paid-plan webhook fulfillment', () => {
  it('uses the original success time and immutable ledger for a duplicate delivery', async () => {
    const f = fixture();
    await expect(fulfillPaidPlanWebhook(f.session, f.stripe, f.admin, 1700000500))
      .resolves.toEqual({ received: true, fulfillment: 'fulfilled' });
    await expect(fulfillPaidPlanWebhook(f.session, f.stripe, f.admin, 1800000000))
      .resolves.toEqual({ received: true, fulfillment: 'already_fulfilled' });
    const writes = f.rpc.mock.calls.filter(([name]) => name === 'fulfill_paid_plan_purchase');
    expect(writes).toHaveLength(2);
    expect(writes[0][1]).toEqual(writes[1][1]);
    expect(writes[0][1]._payment_reference_at).toBe(new Date(1700000400 * 1000).toISOString());
    expect(f.stripe.events.list).toHaveBeenCalledTimes(1);
  });
  it('leaves delayed, unpaid checkout pending without touching entitlements', async () => {
    const f = fixture(); f.session.payment_status = 'unpaid';
    await expect(fulfillPaidPlanWebhook(f.session, f.stripe, f.admin)).resolves.toEqual({ received: true, pending: true });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each(['amount', 'refunded', 'disputed'])('refuses invalid captured-payment evidence: %s', async field => {
    const f = fixture();
    (f.charge as any)[field] = field === 'amount' ? 1 : true;
    await expect(fulfillPaidPlanWebhook(f.session, f.stripe, f.admin, 1700000500)).rejects.toThrow();
    expect(f.rpc.mock.calls.some(([name]) => name === 'fulfill_paid_plan_purchase')).toBe(false);
  });
  it('fails closed when account access cannot be checked', async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } } as any);
    await expect(fulfillPaidPlanWebhook(f.session, f.stripe, f.admin, 1700000500)).rejects.toThrow('access');
    expect(f.stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });
  it('does not process a promotion through the ordinary paid-plan handler', async () => {
    const f = fixture(); f.session.metadata.promotion_reservation_id = 'separate-promotion';
    await expect(fulfillPaidPlanWebhook(f.session, f.stripe, f.admin)).resolves.toEqual({ received: true, ignored: true });
    expect(f.rpc).not.toHaveBeenCalled();
  });
});
