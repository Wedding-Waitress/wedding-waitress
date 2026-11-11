import { validateAdditionalEventQuote } from './additionalEventRules.ts';
import { worldwideGstAmounts } from './worldwideGst.ts';

const packs = {
  credits_10: { credits: 10, cents: 1000, price: 'price_1UFTqt5GzTmqOxGKhwwnh4Wj', product: 'ww_live_20260914_v2_communication_10' },
  credits_100: { credits: 100, cents: 4900, price: 'price_1UFTr55GzTmqOxGKsh0sjgjK', product: 'ww_live_20260914_v2_communication_100' },
} as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (value: any) => typeof value === 'string' ? value : value?.id;
function requireEvidence(ok: unknown): asserts ok {
  if (!ok) throw new Error('Verified add-on payment evidence is inconsistent');
}

/** Only call after signature verification and a fresh server-side session retrieval.
 * Atomic existing RPCs deduplicate webhook retries against return-page fulfilment.
 */
export async function fulfillPaidAddonWebhook(session: any, stripe: any, admin: any) {
  const metadata = session.metadata || {};
  const kind = metadata.purchase_type;
  if (!['additional_event', 'guest_capacity_topup', 'communication_topup'].includes(kind)) {
    return { received: true, ignored: true };
  }
  if (session.payment_status !== 'paid') return { received: true, pending: true };
  requireEvidence(session.object === 'checkout.session' && session.livemode === true
    && /^cs_live_[A-Za-z0-9]+$/.test(session.id) && session.mode === 'payment' && session.status === 'complete'
    && uuid.test(metadata.user_id || '') && !metadata.promotion_version && !metadata.promotion_reservation_id
    && session.currency === 'aud' && session.total_details?.amount_discount === 0
    && session.total_details?.amount_shipping === 0
    && session.line_items?.has_more === false && session.line_items.data.length === 1);
  const line = session.line_items.data[0];
  const price = line.price;
  requireEvidence(price?.currency === 'aud');
  let rpc: string;
  let args: Record<string, unknown>;
  let cents: number;
  let quantity = 1;
  const base = { _user_id: metadata.user_id, _stripe_session_id: session.id };
  const intentId = idOf(session.payment_intent);
  requireEvidence(typeof intentId === 'string' && /^pi_[A-Za-z0-9]+$/.test(intentId));
  if (kind === 'additional_event') {
    cents = validateAdditionalEventQuote(session,line).baseCents;
    rpc = 'fulfill_additional_event_purchase_gst';
    args = { ...base, _stripe_price_id: price.id, _amount: worldwideGstAmounts(cents).totalCents, _currency: 'aud' };
  } else {
    requireEvidence(uuid.test(metadata.event_id || ''));
    if (kind === 'guest_capacity_topup') {
      cents = 1000;
      requireEvidence(/^[1-9][0-9]*$/.test(metadata.overage_blocks || ''));
      quantity = Number(metadata.overage_blocks);
      requireEvidence(quantity <= 100 && price.id === 'price_1UFTqV5GzTmqOxGKkLYcl2PS'
        && idOf(price.product) === 'ww_live_20260914_v2_guest_capacity_10');
      const count = metadata.guest_count_at_purchase;
      requireEvidence(count === undefined || /^[0-9]+$/.test(count) && Number.isSafeInteger(Number(count)));
      rpc = 'fulfill_guest_capacity_topup_gst';
      args = { ...base, _event_id: metadata.event_id, _stripe_payment_id: intentId,
        _amount_paid: worldwideGstAmounts(cents, quantity).totalCents / 100, _blocks: quantity,
        _guest_count_at_purchase: count === undefined || Number(count) === 0 ? null : Number(count) };
    } else {
      const key = metadata.communication_topup_pack || 'credits_100';
      const pack = Object.prototype.hasOwnProperty.call(packs, key) ? packs[key as keyof typeof packs] : null;
      requireEvidence(pack && price.id === pack.price && idOf(price.product) === pack.product);
      cents = pack.cents;
      rpc = 'fulfill_communication_credit_topup_gst';
      args = { ...base, _event_id: metadata.event_id, _stripe_payment_id: intentId, _stripe_price_id: price.id,
        _amount_paid: worldwideGstAmounts(cents).totalCents / 100, _pack_key: key, _credits: pack.credits };
    }
  }
  const quote = worldwideGstAmounts(cents, quantity);
  requireEvidence(price.unit_amount === cents && line.quantity === quantity
    && line.amount_subtotal === quote.originalCents && session.amount_subtotal === quote.originalCents
    && session.total_details.amount_tax === quote.taxCents && session.amount_total === quote.totalCents);
  const { data: blocked, error: accessError } = await admin.rpc('is_account_suspension_blocked', { p_user_id: metadata.user_id });
  requireEvidence(!accessError && blocked === false);
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
  const charge = intent?.latest_charge;
  requireEvidence(intent?.object === 'payment_intent' && intent.id === intentId && intent.livemode === true
    && intent.status === 'succeeded' && intent.currency === 'aud' && intent.amount === quote.totalCents
    && intent.amount_received === quote.totalCents
    && charge?.object === 'charge' && charge.livemode === true && charge.paid === true && charge.captured === true
    && charge.status === 'succeeded' && charge.currency === 'aud' && charge.amount === quote.totalCents
    && idOf(charge.payment_intent) === intentId && charge.refunded === false
    && charge.amount_refunded === 0 && charge.disputed === false);
  const { data: fulfillment, error } = await admin.rpc(rpc, args);
  requireEvidence(!error && fulfillment && typeof fulfillment.already_fulfilled === 'boolean');
  return { received: true, fulfillment: fulfillment.already_fulfilled ? 'already_fulfilled' : 'fulfilled' };
}

