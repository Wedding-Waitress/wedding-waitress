import { PROMOTION_PLANS, promotionPreview, type PromotionPlan } from './promotionRules.ts';

export interface PromotionReservation {
  id: string; percent_off: number; included_credits: number; plan_key: PromotionPlan;
  stripe_session_id: string | null;
  attempt_number?: number;
}
const products: Record<PromotionPlan, string> = {
  essential: 'prod_UOQhHcOhFdrhOs', premium: 'prod_UOQhTWnFzXV1FK', unlimited: 'prod_UOQhLIYTxQAd7U',
};
export interface PromotionCheckoutDependencies {
  reserve(userId: string, code: string, plan: PromotionPlan): Promise<PromotionReservation>;
  ensureCustomer(userId: string, verifiedEmail: string): Promise<string>;
  ensureCoupon(couponId: string, percent: number, productId: string): Promise<string>;
  retrieveSession(sessionId: string): Promise<any>;
  verifyRecordedSession(session: any, reservation: PromotionReservation, userId: string): Promise<void>;
  createSession(parameters: Record<string, unknown>, idempotencyKey: string): Promise<any>;
  bind(reservation: string, session: string, customer: string, product: string, coupon: string, live: boolean): Promise<void>;
  reconcileExpired?(reservation: string, session: any): Promise<void>;
}

/** Provider creation is injectable so local tests never contact Stripe. */
export async function createPromotionCheckout(deps: PromotionCheckoutDependencies, input: {
  userId: string; verifiedEmail: string; code: string; plan: PromotionPlan;
  consent: boolean; returnOrigin: string; livemode: boolean; taxRegistrationVerified: boolean;
}) {
  if (input.consent !== true || !input.userId || !input.verifiedEmail || !Object.prototype.hasOwnProperty.call(PROMOTION_PLANS, input.plan)) throw new Error('Verified first-package purchase and explicit consent required.');
  if (!['https://weddingwaitress.com.au', 'https://www.weddingwaitress.com.au', 'http://localhost:8080'].includes(input.returnOrigin)) throw new Error('Checkout return origin is not approved.');
  if (!input.taxRegistrationVerified) throw new Error('Tax registration must be verified before promotional checkout is enabled.');
  let reservation = await deps.reserve(input.userId, input.code, input.plan);
  const quote = promotionPreview(input.plan, reservation.percent_off);
  if (!reservation.id || reservation.plan_key !== input.plan || reservation.included_credits !== quote.includedCredits) throw new Error('Reservation does not match the approved offer.');
  if (reservation.stripe_session_id) {
    const previous = await deps.retrieveSession(reservation.stripe_session_id);
    if (!previous || previous.id !== reservation.stripe_session_id || previous.metadata?.promotion_reservation_id !== reservation.id
      || previous.metadata?.user_id !== input.userId || previous.livemode !== input.livemode
      || previous.mode !== 'payment' || previous.metadata?.promotion_version !== '1'
      || previous.metadata?.plan_type !== input.plan || previous.metadata?.plan_purchase_purpose !== 'new_plan'
      || previous.metadata?.purchase_consent !== 'explicit-v1'
      || !['open', 'complete', 'expired'].includes(previous.status)) throw new Error('Previous checkout must be reconciled before starting another.');
    if(previous.status==='expired'){
      if(!deps.reconcileExpired||previous.payment_status!=='unpaid'||previous.payment_intent!=null||previous.mode!=='payment'||!previous.customer)throw new Error('Previous checkout must be reconciled before starting another.');
      await deps.reconcileExpired(reservation.id,previous);
      const refreshed=await deps.reserve(input.userId,input.code,input.plan);
      if(refreshed.id!==reservation.id||refreshed.stripe_session_id!==null||refreshed.percent_off!==reservation.percent_off||refreshed.included_credits!==reservation.included_credits
        ||refreshed.attempt_number!==(reservation.attempt_number??0)+1)throw new Error('Expired checkout recovery could not be confirmed.');
      reservation=refreshed;
    }else{
      await deps.verifyRecordedSession(previous, reservation, input.userId);
      if (!previous.client_secret) throw new Error('Recorded checkout cannot be reopened.');
      return { session: previous, quote, reservation };
    }
  }
  const customerId = await deps.ensureCustomer(input.userId, input.verifiedEmail);
  const productId = products[input.plan];
  const attemptSuffix=reservation.attempt_number?`:${reservation.attempt_number}`:'';
  const couponId = await deps.ensureCoupon(`ww-promotion-${reservation.id}${attemptSuffix}`, reservation.percent_off, productId);
  const session = await deps.createSession({
    customer: customerId, mode: 'payment', ui_mode: 'embedded',
    line_items: [{ quantity: 1, price_data: { currency: 'aud', product: productId,
      unit_amount: quote.originalCents, tax_behavior: 'exclusive' } }],
    discounts: [{ coupon: couponId }], automatic_tax: { enabled: true },
    customer_update: { address: 'auto' }, billing_address_collection: 'required',
    return_url: `${input.returnOrigin}/payment-success?promotion=1&session_id={CHECKOUT_SESSION_ID}`,
    // Stable random-letter UUID-derived suffix for Dashboard integration tracking.
    integration_identifier: `wedding-waitress-promotions-${reservation.id.replace(/[^0-9a-f]/g, '').slice(-8).split('').map(character => String.fromCharCode(97 + parseInt(character, 16))).join('')}`,
    metadata: { promotion_version: '1', user_id: input.userId, promotion_reservation_id: reservation.id,
      plan_type: input.plan, plan_purchase_purpose: 'new_plan', purchase_consent: 'explicit-v1' },
  }, `ww-promotion-checkout:${reservation.id}${attemptSuffix}`);
  if (!session.id || !session.client_secret || session.customer !== customerId || session.livemode !== input.livemode) throw new Error('Provider checkout could not be confirmed.');
  // Never expose a checkout secret before its identity is durably bound.
  await deps.bind(reservation.id, session.id, customerId, productId, couponId, input.livemode);
  return { session, quote, reservation };
}
