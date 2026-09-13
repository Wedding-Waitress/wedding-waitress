import type { RetrievedPromotionSession, RetrievedPromotionPayment, StoredPromotionCheckout } from './promotionFulfillment.ts';

const providerId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') return value.id;
  throw new Error('Expanded provider identity is missing.');
};
const minorAmount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Provider amount is invalid.');
  return value;
};

/** Provider adapter only: input must be retrieved server-side, never browser JSON. */
export function parsePromotionStripeSession(session: any, lines: any, stored: StoredPromotionCheckout): RetrievedPromotionSession {
  if (!lines || lines.has_more !== false || !Array.isArray(lines.data) || lines.data.length !== 1) throw new Error('One complete package line is required.');
  const line = lines.data[0];
  if (!line.price || line.price.recurring || line.price.currency !== 'aud' || line.price.tax_behavior !== 'exclusive') throw new Error('Approved one-time AUD package price required.');
  if (!Array.isArray(line.discounts) || line.discounts.length !== 1 || typeof line.discounts[0].discount !== 'object') throw new Error('One expanded applied discount is required.');
  const discount = line.discounts[0].discount;
  // Current SDKs expose source.coupon; the existing legacy integration exposes coupon.
  if (discount.source && discount.source.type !== 'coupon') throw new Error('Only the recorded direct coupon is allowed.');
  const coupon = discount.source?.coupon ?? discount.coupon;
  if (!coupon || typeof coupon !== 'object' || coupon.percent_off !== stored.percent || coupon.amount_off != null
    || !coupon.applies_to?.products?.includes(stored.productId)) throw new Error('Expanded coupon does not match the recorded percentage/package.');
  if (discount.source?.coupon && discount.coupon && providerId(discount.source.coupon) !== providerId(discount.coupon)) throw new Error('Conflicting coupon identities.');
  const discountCents = minorAmount(line.amount_discount);
  if (minorAmount(session.total_details?.amount_discount) !== discountCents
    || minorAmount(line.discounts[0].amount) !== discountCents || minorAmount(line.amount_subtotal) !== minorAmount(session.amount_subtotal)) throw new Error('Line and checkout amounts disagree.');
  const metadata = session.metadata ?? {};
  if (metadata.purchase_consent !== 'explicit-v1' || metadata.plan_purchase_purpose !== 'new_plan') throw new Error('Explicit first-purchase consent required.');
  return {
    id: providerId(session), customerId: providerId(session.customer), productId: providerId(line.price.product),
    couponId: providerId(coupon), reservationId: metadata.promotion_reservation_id, userId: metadata.user_id,
    plan: metadata.plan_type, livemode: session.livemode, mode: session.mode, quantity: line.quantity,
    status: session.status, paymentStatus: session.payment_status, currency: session.currency,
    subtotalCents: minorAmount(session.amount_subtotal), totalCents: minorAmount(session.amount_total),
    discountCents, paymentIntentId: session.payment_intent == null ? null : providerId(session.payment_intent),
  };
}

export function parsePromotionStripePayment(intent: any): RetrievedPromotionPayment {
  const charge = intent.latest_charge;
  if (!charge || typeof charge !== 'object' || charge.payment_intent == null || providerId(charge.payment_intent) !== providerId(intent)
    || charge.customer == null || providerId(charge.customer) !== providerId(intent.customer)
    || charge.currency !== intent.currency || charge.livemode !== intent.livemode
    || minorAmount(charge.amount) !== minorAmount(intent.amount_received)) throw new Error('Captured payment identity is inconsistent.');
  return {
    id: providerId(intent), customerId: providerId(intent.customer), livemode: intent.livemode,
    status: intent.status, currency: intent.currency, amountReceivedCents: minorAmount(intent.amount_received),
    captured: charge.captured === true && charge.paid === true,
    refunded: charge.refunded === true || minorAmount(charge.amount_refunded) > 0,
    disputed: charge.disputed === true,
  };
}
