import { promotionTermStart, promotionTermEnd, validatePromotionCompletion, type PromotionPlan } from './promotionRules.ts';

export interface StoredPromotionCheckout {
  id: string; userId: string; plan: PromotionPlan; percent: number; couponId: string;
  customerId: string; productId: string; sessionId: string; livemode: boolean;
  originalTrialEndsAt: string; createdAt: string; completionEventId: string | null;
}
export interface RetrievedPromotionSession {
  id: string; customerId: string; productId: string; couponId: string;
  reservationId: string; userId: string; plan: PromotionPlan; livemode: boolean;
  mode: string; quantity: number; status: string; paymentStatus: string;
  currency: string; subtotalCents: number; totalCents: number; discountCents: number;
  paymentIntentId: string | null;
}
export interface RetrievedPromotionCompletion {
  id: string; type: string; sessionId: string; livemode: boolean; createdAt: string;
}
export interface RetrievedPromotionPayment {
  id: string; customerId: string; livemode: boolean; status: string;
  currency: string; amountReceivedCents: number; captured: boolean;
  refunded: boolean; disputed: boolean;
}
export interface PromotionFulfillmentDependencies {
  // Implementations must retrieve these using server credentials, not request metadata.
  lookupCheckout(sessionId: string): Promise<StoredPromotionCheckout>;
  retrieveSession(sessionId: string): Promise<RetrievedPromotionSession>;
  findOriginalCompletion(sessionId: string, recordedEventId: string | null): Promise<RetrievedPromotionCompletion>;
  retrievePayment(paymentIntentId: string): Promise<RetrievedPromotionPayment>;
  fulfillAtomically(evidence: {
    reservationId: string; sessionId: string; completionEventId: string; userId: string;
    plan: PromotionPlan; subtotalCents: number; totalCents: number; discountCents: number;
    percent: number; includedCredits: number; paymentIntentId: string | null;
    completedAt: string; termStartsAt: string; livemode: boolean;
  }): Promise<{ result: 'fulfilled' | 'already_fulfilled'; startsAt: string; expiresAt: string }>;
}

/** No Stripe creation or charge occurs here. This verifies retrieved completion evidence. */
export async function fulfillPromotionCheckout(deps: PromotionFulfillmentDependencies, sessionId: string, now: number) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !Number.isFinite(now)) throw new Error('A valid recorded checkout is required.');
  const stored = await deps.lookupCheckout(sessionId);
  if (!stored || stored.sessionId !== sessionId || !stored.userId || !stored.id
    || !stored.customerId || !stored.productId || !stored.couponId) throw new Error('Checkout is not bound to a stored promotional reservation.');
  const session = await deps.retrieveSession(sessionId);
  if (session.id !== sessionId || session.customerId !== stored.customerId || session.productId !== stored.productId
    || session.reservationId !== stored.id || session.userId !== stored.userId || session.plan !== stored.plan
    || session.livemode !== stored.livemode || session.mode !== 'payment' || session.quantity !== 1) {
    throw new Error('Checkout identity does not match the recorded promotional purchase.');
  }
  const quote = validatePromotionCompletion({ ...session, percent: stored.percent, plan: stored.plan, expectedCouponId: stored.couponId });
  const completion = await deps.findOriginalCompletion(sessionId, stored.completionEventId);
  const completedAt = Date.parse(completion.createdAt), createdAt = Date.parse(stored.createdAt);
  if (!/^evt_[A-Za-z0-9]+$/.test(completion.id) || completion.type !== 'checkout.session.completed'
    || completion.sessionId !== sessionId || completion.livemode !== stored.livemode
    || !Number.isFinite(completedAt) || !Number.isFinite(createdAt) || completedAt < Math.floor(createdAt / 1000) * 1000 || completedAt > now
    || stored.completionEventId !== null && completion.id !== stored.completionEventId) {
    throw new Error('Original provider completion evidence is unavailable or inconsistent.');
  }
  if (stored.percent < 100) {
    const payment = await deps.retrievePayment(session.paymentIntentId!);
    if (payment.id !== session.paymentIntentId || payment.customerId !== stored.customerId
      || payment.livemode !== stored.livemode || payment.status !== 'succeeded' || payment.currency.toUpperCase() !== 'AUD'
      || payment.amountReceivedCents !== session.totalCents || !payment.captured || payment.refunded || payment.disputed) {
      throw new Error('A matching captured, undisputed discounted payment is required.');
    }
  }
  const termStartsAt = promotionTermStart(completion.createdAt, stored.originalTrialEndsAt);
  const evidence = {
    reservationId: stored.id, sessionId, completionEventId: completion.id, userId: stored.userId,
    plan: stored.plan, subtotalCents: session.subtotalCents, totalCents: session.totalCents,
    discountCents: session.discountCents, percent: stored.percent, includedCredits: quote.includedCredits,
    paymentIntentId: session.paymentIntentId, completedAt: new Date(completedAt).toISOString(), termStartsAt,
    livemode: stored.livemode,
  };
  // Database implementation must recheck account restrictions, original trial,
  // first-purchase eligibility and immutable evidence under a transaction lock.
  const result = await deps.fulfillAtomically(evidence);
  if (!result || !['fulfilled', 'already_fulfilled'].includes(result.result)
    || Date.parse(result.startsAt) !== Date.parse(termStartsAt) || !Number.isFinite(Date.parse(result.expiresAt))
    || Date.parse(result.expiresAt) !== Date.parse(promotionTermEnd(termStartsAt))) throw new Error('No valid promotional access term was confirmed.');
  return { ...result, includedCredits: quote.includedCredits, activation: Date.parse(result.expiresAt) <= now ? 'expired' : Date.parse(result.startsAt) > now ? 'scheduled' : 'active' };
}
