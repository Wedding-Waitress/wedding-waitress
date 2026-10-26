import { validatePaidPlanFulfillmentEvidence, validatePaidPlanLedgerReplayEvidence } from './paidPlanFulfillmentEvidence.ts';
import { findOriginalPaymentSuccessEvent } from './originalPaymentSuccessEvent.ts';

/** Called only after raw-body Stripe signature verification and server retrieval
 * of the Checkout session. No browser session or return-page visit is required.
 * Reuses the atomic fulfillment RPC, so webhook retries and page verification
 * cannot grant the package or included credits twice.
 */
export async function fulfillPaidPlanWebhook(session: any, stripe: any, admin: any,
  serverNow = Math.floor(Date.now() / 1000)) {
  const metadata = session.metadata || {};
  if (metadata.promotion_version || metadata.promotion_reservation_id || metadata.purchase_type || metadata.type === 'access_extension'
    || !['new_plan', 'renewal', 'upgrade'].includes(metadata.plan_purchase_purpose)) {
    return { received: true, ignored: true };
  }
  if (session.payment_status !== 'paid') return { received: true, pending: true };
  const userId = metadata.user_id;
  if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('Payment account evidence is invalid');
  }
  const { data: blocked, error: accessError } = await admin.rpc('is_account_suspension_blocked', { p_user_id: userId });
  if (accessError || blocked !== false) throw new Error('Payment account access could not be verified');
  const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!intentId) throw new Error('Verified payment intent is required');
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
  const charge = typeof intent.latest_charge === 'object' && intent.latest_charge ? intent.latest_charge : null;
  if (!charge) throw new Error('Verified captured payment is required');
  const { data: prior, error: ledgerError } = await admin.from('paid_plan_purchases')
    .select('user_id,stripe_session_id,stripe_payment_intent_id,plan_id,purpose,currency,amount_subtotal_cents,amount_total_cents,catalogue_version,payment_reference_at')
    .eq('user_id', userId).eq('stripe_session_id', session.id).maybeSingle();
  if (ledgerError) throw new Error('Original payment ledger could not be verified');
  const evidence = prior
    ? validatePaidPlanLedgerReplayEvidence(session, intent, charge, prior, serverNow)
    : validatePaidPlanFulfillmentEvidence(session, intent, charge,
      await findOriginalPaymentSuccessEvent(intentId, intent.created, serverNow, async query => {
        const page = await stripe.events.list(query);
        return { has_more: page.has_more, data: page.data.map((event: any) => ({
          id: event.id, object: event.object, type: event.type, livemode: event.livemode,
          created: event.created, data: { object: { id: event.data?.object?.id, status: event.data?.object?.status } },
        })) };
      }), serverNow);
  const { data: fulfillment, error } = await admin.rpc('fulfill_paid_plan_purchase', evidence);
  if (error || !fulfillment || !['fulfilled', 'already_fulfilled'].includes(fulfillment.result)
    || fulfillment.plan_id !== evidence._plan_id || !['active', 'expired'].includes(fulfillment.status)
    || !Number.isFinite(Date.parse(fulfillment.started_at)) || !Number.isFinite(Date.parse(fulfillment.expires_at))
    || Date.parse(fulfillment.expires_at) <= Date.parse(fulfillment.started_at)) {
    throw new Error('Verified payment fulfillment returned no valid access term');
  }
  return { received: true, fulfillment: fulfillment.result };
}
