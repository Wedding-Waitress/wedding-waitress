/** Pure validation of SERVER-retrieved Stripe objects / signature-verified events.
 * Never call this with caller-supplied provider objects. No charges, retries, or DB writes.
 */
export const PAID_PLAN_CATALOGUE_VERSION = 'ww-aud-couple-20260909';
/** Separate owner-approved live Stripe activation is still required. */
export const PAID_PLAN_LIVE_CHECKOUT_ENABLED = false;
const plans = {
  essential: { product: 'prod_UOQhHcOhFdrhOs', id: '78cdab0d-d81d-4757-b7cc-f210b8b30f47', cents: 19900, rank: 1 },
  premium: { product: 'prod_UOQhTWnFzXV1FK', id: '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8', cents: 24900, rank: 2 },
  unlimited: { product: 'prod_UOQhLIYTxQAd7U', id: 'cd10f207-2109-4546-a635-0baa68ba8213', cents: 29900, rank: 3 },
} as const;
type ObjectData = Record<string, any>;
const idOf = (value: unknown): string | null => typeof value === 'string' ? value
  : value && typeof value === 'object' && typeof (value as ObjectData).id === 'string' ? (value as ObjectData).id : null;
const cents = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const timestamp = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= 8640000000000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function requireEvidence(valid: unknown): asserts valid {
  if (!valid) throw new Error('Verified original paid-plan evidence is incomplete or inconsistent');
}

export function validatePaidPlanFulfillmentEvidence(
  session: ObjectData, intent: ObjectData, charge: ObjectData, successfulEvent: ObjectData,
  serverNowEpochSeconds: number,
) {
  requireEvidence(session && intent && charge && successfulEvent && timestamp(serverNowEpochSeconds));
  requireEvidence(successfulEvent.object === 'event' && successfulEvent.livemode === true
    && successfulEvent.type === 'payment_intent.succeeded' && /^evt_[A-Za-z0-9]+$/.test(successfulEvent.id)
    && successfulEvent.data?.object?.id === intent.id && successfulEvent.data.object.status === 'succeeded');
  return validatePaidPlanObjects(session, intent, charge, successfulEvent.created, serverNowEpochSeconds);
}

/** Replay source must be a service-side read of our immutable fulfillment ledger.
 * Browser fields, webhook payloads and arbitrary metadata are not ledger evidence.
 * Full current provider objects are still verified (refund/dispute fails closed).
 */
export function validatePaidPlanLedgerReplayEvidence(
  session: ObjectData, intent: ObjectData, charge: ObjectData, ledger: ObjectData,
  serverNowEpochSeconds: number,
) {
  requireEvidence(ledger && typeof ledger.payment_reference_at === 'string');
  const referenceSeconds = Date.parse(ledger.payment_reference_at) / 1000;
  const evidence = validatePaidPlanObjects(session, intent, charge, referenceSeconds, serverNowEpochSeconds);
  requireEvidence(ledger.user_id === evidence._user_id && ledger.stripe_session_id === evidence._stripe_session_id
    && ledger.stripe_payment_intent_id === evidence._stripe_payment_intent_id && ledger.plan_id === evidence._plan_id
    && ledger.purpose === evidence._purpose && ledger.currency === evidence._currency
    && ledger.catalogue_version === evidence._catalogue_version
    && ledger.amount_subtotal_cents === evidence._amount_subtotal_cents && ledger.amount_total_cents === evidence._amount_total_cents);
  return evidence;
}

function validatePaidPlanObjects(session: ObjectData, intent: ObjectData, charge: ObjectData,
  referenceSeconds: number, serverNowEpochSeconds: number) {
  requireEvidence(session && intent && charge && timestamp(serverNowEpochSeconds));
  requireEvidence(session.object === 'checkout.session' && session.mode === 'payment'
    && session.status === 'complete' && session.payment_status === 'paid' && session.livemode === true
    && typeof session.id === 'string' && /^cs_live_[A-Za-z0-9]+$/.test(session.id));
  const metadata = session.metadata;
  requireEvidence(metadata && typeof metadata.user_id === 'string' && uuid.test(metadata.user_id)
    && metadata.catalogue_version === PAID_PLAN_CATALOGUE_VERSION && metadata.purchase_consent === 'explicit-v1'
    && ['new_plan', 'renewal', 'upgrade'].includes(metadata.plan_purchase_purpose));
  const plan = plans[metadata.plan_type as keyof typeof plans];
  requireEvidence(plan);
  const previous = metadata.plan_purchase_purpose === 'upgrade' ? plans[metadata.from_plan as keyof typeof plans] : null;
  requireEvidence(metadata.plan_purchase_purpose !== 'upgrade' || previous && previous.rank < plan.rank);
  requireEvidence(metadata.plan_purchase_purpose === 'upgrade' || !metadata.from_plan);
  const expectedSubtotal = previous ? plan.cents - previous.cents : plan.cents;
  const lines = session.line_items;
  requireEvidence(lines && lines.has_more === false && Array.isArray(lines.data) && lines.data.length === 1);
  const line = lines.data[0];
  requireEvidence(line.quantity === 1 && line.price && line.price.currency === 'aud'
    && idOf(line.price.product) === plan.product && line.price.unit_amount === expectedSubtotal
    && line.amount_subtotal === expectedSubtotal);
  requireEvidence(session.currency === 'aud' && session.amount_subtotal === expectedSubtotal && cents(session.amount_total));
  const totals = session.total_details;
  requireEvidence(totals && totals.amount_discount === 0 && totals.amount_shipping === 0 && cents(totals.amount_tax)
    && session.amount_total === expectedSubtotal + totals.amount_tax);
  requireEvidence(intent.object === 'payment_intent' && intent.livemode === true && intent.status === 'succeeded'
    && typeof intent.id === 'string' && /^pi_[A-Za-z0-9]+$/.test(intent.id) && idOf(session.payment_intent) === intent.id
    && intent.currency === 'aud' && intent.amount === session.amount_total && intent.amount_received === session.amount_total);
  requireEvidence(charge.object === 'charge' && charge.livemode === true && charge.status === 'succeeded'
    && charge.paid === true && charge.captured === true && charge.refunded === false && charge.amount_refunded === 0
    && charge.disputed === false && charge.currency === 'aud' && charge.amount === session.amount_total
    && typeof charge.id === 'string' && /^ch_[A-Za-z0-9]+$/.test(charge.id)
    && idOf(intent.latest_charge) === charge.id && idOf(charge.payment_intent) === intent.id);
  requireEvidence(timestamp(session.created) && timestamp(intent.created) && timestamp(charge.created)
    && timestamp(referenceSeconds) && referenceSeconds <= serverNowEpochSeconds
    && referenceSeconds >= session.created && referenceSeconds >= intent.created
    && referenceSeconds >= charge.created);
  // Event creation records the successful transition, not object creation / verification-page time.
  return {
    _user_id: metadata.user_id, _stripe_session_id: session.id, _stripe_payment_intent_id: intent.id,
    _plan_id: plan.id, _purpose: metadata.plan_purchase_purpose,
    _amount_subtotal_cents: expectedSubtotal, _amount_total_cents: session.amount_total,
    _currency: 'AUD', _payment_status: 'paid', _is_live: true,
    _payment_reference_at: new Date(referenceSeconds * 1000).toISOString(),
    _catalogue_version: PAID_PLAN_CATALOGUE_VERSION, _previous_plan_id: previous?.id ?? null,
  };
}
