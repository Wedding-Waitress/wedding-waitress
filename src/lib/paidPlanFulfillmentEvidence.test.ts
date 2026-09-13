import { describe, expect, it } from 'vitest';
import { PAID_PLAN_CATALOGUE_VERSION, validatePaidPlanFulfillmentEvidence, validatePaidPlanLedgerReplayEvidence } from '../../supabase/functions/_shared/paidPlanFulfillmentEvidence';
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fixture = () => ({
  session: { object: 'checkout.session', id: 'cs_live_Original1', livemode: true, mode: 'payment', status: 'complete', payment_status: 'paid',
    created: 1700000000, payment_intent: 'pi_Original1', currency: 'aud', amount_subtotal: 19900, amount_total: 21890,
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 1990 },
    metadata: { user_id: owner, plan_type: 'essential', catalogue_version: PAID_PLAN_CATALOGUE_VERSION, purchase_consent: 'explicit-v1', plan_purchase_purpose: 'renewal' },
    line_items: { has_more: false, data: [{ quantity: 1, amount_subtotal: 19900, price: { currency: 'aud', unit_amount: 19900, product: 'prod_UOQhHcOhFdrhOs' } }] } },
  intent: { object: 'payment_intent', id: 'pi_Original1', livemode: true, status: 'succeeded', latest_charge: 'ch_Original1', currency: 'aud', amount: 21890, amount_received: 21890, created: 1700000001 },
  charge: { object: 'charge', id: 'ch_Original1', payment_intent: 'pi_Original1', livemode: true, status: 'succeeded', paid: true, captured: true, refunded: false, amount_refunded: 0, disputed: false, currency: 'aud', amount: 21890, created: 1700000002 },
  event: { object: 'event', id: 'evt_Original1', livemode: true, type: 'payment_intent.succeeded', created: 1700000400, data: { object: { id: 'pi_Original1', status: 'succeeded' } } },
});
describe('original paid-plan provider evidence', () => {
  it('replays an immutable recorded payment after provider event retention without resetting its time', () => {
    const f = fixture();
    const original = validatePaidPlanFulfillmentEvidence(f.session, f.intent, f.charge, f.event, 1700000500);
    const ledger = { user_id: owner, stripe_session_id: f.session.id, stripe_payment_intent_id: f.intent.id,
      plan_id: original._plan_id, purpose: original._purpose, currency: 'AUD', catalogue_version: PAID_PLAN_CATALOGUE_VERSION,
      amount_subtotal_cents: 19900, amount_total_cents: 21890, payment_reference_at: original._payment_reference_at };
    expect(validatePaidPlanLedgerReplayEvidence(f.session, f.intent, f.charge, ledger, 1800000000)).toEqual(original);
    for (const invalid of [{ user_id: 'foreign' }, { stripe_session_id: 'cs_live_Foreign' },
      { stripe_payment_intent_id: 'pi_Foreign' }, { plan_id: 'foreign' }, { purpose: 'new_plan' },
      { currency: 'USD' }, { amount_total_cents: 19900 }, { amount_subtotal_cents: 1 },
      { catalogue_version: 'legacy' }, { payment_reference_at: 'invalid' },
      { payment_reference_at: new Date((f.charge.created - 1) * 1000).toISOString() }]) {
      expect(() => validatePaidPlanLedgerReplayEvidence(f.session, f.intent, f.charge, { ...ledger, ...invalid }, 1800000000)).toThrow();
    }
    expect(() => validatePaidPlanLedgerReplayEvidence(f.session, f.intent, { ...f.charge, refunded: true }, ledger, 1800000000)).toThrow();
  });
  it('uses original successful transition time, not earlier charge creation or later page verification', () => {
    const f = fixture();
    const first = validatePaidPlanFulfillmentEvidence(f.session, f.intent, f.charge, f.event, 1700000500);
    expect(first._payment_reference_at).toBe(new Date(f.event.created * 1000).toISOString());
    expect(first._payment_reference_at).not.toBe(new Date(f.charge.created * 1000).toISOString());
    expect(validatePaidPlanFulfillmentEvidence(f.session, f.intent, f.charge, f.event, 1800000000)).toEqual(first);
    expect(first._user_id).toBe(owner);
  });
  it.each([
    ['session', 'livemode', false], ['session', 'status', 'open'], ['session', 'payment_status', 'unpaid'], ['session', 'currency', 'usd'],
    ['intent', 'status', 'processing'], ['intent', 'livemode', false], ['intent', 'amount_received', 0], ['intent', 'latest_charge', 'ch_Foreign'],
    ['charge', 'captured', false], ['charge', 'refunded', true], ['charge', 'amount_refunded', 1], ['charge', 'disputed', true],
    ['charge', 'payment_intent', 'pi_Foreign'], ['event', 'livemode', false], ['event', 'type', 'checkout.session.completed'], ['event', 'created', 1900000000],
  ])('rejects %s.%s=%s without granting access', (object, key, value) => {
    const f = fixture(); (f as any)[object][key] = value;
    expect(() => validatePaidPlanFulfillmentEvidence(f.session, f.intent, f.charge, f.event, 1800000000)).toThrow();
  });
  it('rejects missing explicit consent, removed plans and legacy amount mismatches', () => {
    const f = fixture();
    for (const change of [{ purchase_consent: '' }, { plan_type: 'vendor_pro' }, { catalogue_version: 'legacy' }, { plan_purchase_purpose: '' }]) {
      expect(() => validatePaidPlanFulfillmentEvidence({ ...f.session, metadata: { ...f.session.metadata, ...change } }, f.intent, f.charge, f.event, 1800000000)).toThrow();
    }
    expect(() => validatePaidPlanFulfillmentEvidence({ ...f.session, amount_subtotal: 15000 }, f.intent, f.charge, f.event, 1800000000)).toThrow();
  });
  it('rejects mismatched success-event ownership and incomplete/multiple line items', () => {
    const f = fixture();
    expect(() => validatePaidPlanFulfillmentEvidence(f.session, f.intent, f.charge, { ...f.event, data: { object: { id: 'pi_Foreign', status: 'succeeded' } } }, 1800000000)).toThrow();
    expect(() => validatePaidPlanFulfillmentEvidence({ ...f.session, line_items: { ...f.session.line_items, has_more: true } }, f.intent, f.charge, f.event, 1800000000)).toThrow();
    expect(() => validatePaidPlanFulfillmentEvidence({ ...f.session, line_items: { has_more: false, data: [...f.session.line_items.data, ...f.session.line_items.data] } }, f.intent, f.charge, f.event, 1800000000)).toThrow();
  });
  it('binds an upward upgrade to the exact approved price difference and original source plan', () => {
    const f = fixture();
    const session = { ...f.session, amount_subtotal: 5000, amount_total: 5500, total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 500 },
      metadata: { ...f.session.metadata, plan_type: 'premium', from_plan: 'essential', plan_purchase_purpose: 'upgrade' },
      line_items: { has_more: false, data: [{ quantity: 1, amount_subtotal: 5000, price: { currency: 'aud', unit_amount: 5000, product: 'prod_UOQhTWnFzXV1FK' } }] } };
    const intent = { ...f.intent, amount: 5500, amount_received: 5500 };
    const charge = { ...f.charge, amount: 5500 };
    const evidence = validatePaidPlanFulfillmentEvidence(session, intent, charge, f.event, 1800000000);
    expect(evidence._amount_subtotal_cents).toBe(5000);
    expect(evidence._previous_plan_id).toBe('78cdab0d-d81d-4757-b7cc-f210b8b30f47');
    expect(evidence._plan_id).toBe('1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8');
    expect(() => validatePaidPlanFulfillmentEvidence({ ...session, metadata: { ...session.metadata, from_plan: 'unlimited' } }, intent, charge, f.event, 1800000000)).toThrow();
    expect(() => validatePaidPlanFulfillmentEvidence({ ...session, metadata: { ...session.metadata, from_plan: 'premium' } }, intent, charge, f.event, 1800000000)).toThrow();
  });
});
