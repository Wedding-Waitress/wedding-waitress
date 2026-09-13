import { parsePromotionStripePayment, parsePromotionStripeSession } from './promotionStripeEvidence.ts';
import type { PromotionCheckoutDependencies } from './promotionCheckoutService.ts';
import { promotionPreview } from './promotionRules.ts';
import type { PromotionFulfillmentDependencies, StoredPromotionCheckout } from './promotionFulfillment.ts';

export function promotionProviderAdapter(db: any, stripe: any, live: boolean): PromotionCheckoutDependencies & PromotionFulfillmentDependencies {
  const rpc = async (name: string, parameters: Record<string, unknown>) => {
    const result = await db.rpc(name, parameters);
    if (result.error) throw new Error('Promotional database operation could not be confirmed.');
    return result.data;
  };
  let stored: StoredPromotionCheckout | null = null;
  return {
    reserve: (userId, code, plan) => rpc('reserve_first_purchase_promotion', { p_user: userId, p_code: code, p_plan: plan }),
    ensureCustomer: async (userId, email) => {
      const existing = await rpc('promotion_customer_binding', { p_user: userId });
      if (existing) return existing;
      const customer = await stripe.customers.create({ email, metadata: { wedding_waitress_user_id: userId } }, { idempotencyKey: `ww-promotion-customer:${userId}` });
      if (!customer.id || customer.livemode !== live) throw new Error('Customer could not be confirmed.');
      return rpc('promotion_customer_binding', { p_user: userId, p_customer: customer.id });
    },
    ensureCoupon: async (id, percent, product) => {
      let coupon;
      try { coupon = await stripe.coupons.retrieve(id); }
      catch (failure: any) {
        if (failure.code !== 'resource_missing') throw new Error('Coupon lookup could not be confirmed.');
        coupon = await stripe.coupons.create({ id, percent_off: percent, duration: 'once',
          max_redemptions: 1, applies_to: { products: [product] } }, { idempotencyKey: `ww-promotion-coupon:${id}` });
      }
      if (coupon.id !== id || coupon.percent_off !== percent || coupon.amount_off != null || coupon.valid !== true
        || coupon.applies_to?.products?.length !== 1 || coupon.applies_to.products[0] !== product) throw new Error('Coupon does not match the reserved package.');
      return coupon.id;
    },
    retrieveSession: sessionId => stripe.checkout.sessions.retrieve(sessionId),
    verifyRecordedSession: async (session, reservation, userId) => {
      const row = await rpc('promotion_checkout_context', { p_session: session.id });
      if (!row || row.id !== reservation.id || row.account_user_id !== userId
        || row.stripe_session_id !== session.id || row.plan_key !== reservation.plan_key
        || row.percent_off !== reservation.percent_off || row.livemode !== live
        || !row.stripe_customer_id || !row.stripe_product_id || !row.stripe_coupon_id) {
        throw new Error('Recorded checkout binding could not be confirmed.');
      }
      const context: StoredPromotionCheckout = { id: row.id, userId, plan: row.plan_key, percent: row.percent_off,
        couponId: row.stripe_coupon_id, customerId: row.stripe_customer_id, productId: row.stripe_product_id,
        sessionId: row.stripe_session_id, livemode: row.livemode, originalTrialEndsAt: row.original_trial_ends_at,
        createdAt: row.created_at, completionEventId: row.completion_event_id };
      const parsed = await retrieveSessionEvidence(stripe, session, context);
      const quote = promotionPreview(context.plan, context.percent);
      if (parsed.customerId !== context.customerId || parsed.productId !== context.productId
        || parsed.couponId !== context.couponId || parsed.reservationId !== context.id
        || parsed.userId !== userId || parsed.plan !== context.plan || parsed.livemode !== live
        || parsed.mode !== 'payment' || parsed.quantity !== 1 || parsed.currency !== 'aud'
        || parsed.subtotalCents !== quote.originalCents || parsed.discountCents !== quote.discountCents
        || parsed.totalCents < quote.subtotalCents
        || context.percent === 100 && parsed.totalCents !== 0) {
        throw new Error('Recorded checkout offer does not match its binding.');
      }
    },
    reconcileExpired: async (reservation, session) => {
      await rpc('reconcile_expired_promotion_checkout',{p_reservation:reservation,p_evidence:{id:session.id,status:session.status,payment_status:session.payment_status,
        mode:session.mode,customer:typeof session.customer==='string'?session.customer:session.customer?.id,livemode:session.livemode,
        payment_intent:session.payment_intent,metadata:session.metadata}});
    },
    createSession: (parameters, key) => stripe.checkout.sessions.create(parameters, { idempotencyKey: key }),
    bind: async (reservation, session, customer, product, coupon, isLive) => {
      await rpc('bind_promotion_checkout', { p_reservation: reservation, p_session: session,
        p_customer: customer, p_product: product, p_coupon: coupon, p_live: isLive });
    },
    lookupCheckout: async sessionId => {
      const row = await rpc('promotion_checkout_context', { p_session: sessionId });
      stored = { id: row.id, userId: row.account_user_id, plan: row.plan_key, percent: row.percent_off,
        couponId: row.stripe_coupon_id, customerId: row.stripe_customer_id, productId: row.stripe_product_id,
        sessionId: row.stripe_session_id, livemode: row.livemode, originalTrialEndsAt: row.original_trial_ends_at,
        createdAt: row.created_at, completionEventId: row.completion_event_id };
      return stored;
    },
    // Assigned below in the completion adapter to avoid changing Checkout reuse semantics.
    findOriginalCompletion: async (sessionId, eventId) => {
      let event: any = null;
      if (eventId) event = await stripe.events.retrieve(eventId);
      else {
        if (!stored) throw new Error('Stored checkout context required.');
        let cursor: string | undefined;
        for (let page = 0; page < 20; page++) {
          const events = await stripe.events.list({ types: ['checkout.session.completed'],
            created: { gte: Math.floor(Date.parse(stored.createdAt) / 1000) }, limit: 100,
            ...(cursor ? { starting_after: cursor } : {}) });
          const match = events.data.filter((candidate: any) => candidate.data?.object?.id === sessionId);
          for (const candidate of match) if (!event || candidate.created < event.created) event = candidate;
          if (!events.has_more) break;
          if (page === 19) throw new Error('Original completion event search is incomplete.');
          cursor = events.data.at(-1)?.id;
          if (!cursor) throw new Error('Completion event pagination is inconsistent.');
        }
      }
      if (!event) throw new Error('Original provider completion event is unavailable.');
      return { id: event.id, type: event.type, sessionId: event.data?.object?.id,
        livemode: event.livemode, createdAt: new Date(event.created * 1000).toISOString() };
    },
    retrievePayment: async id => parsePromotionStripePayment(await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] })),
    fulfillAtomically: async evidence => {
      const result = await rpc('fulfill_promotion_checkout_atomic', { p_evidence: {
        reservation_id: evidence.reservationId, session_id: evidence.sessionId, currency: 'AUD', livemode: evidence.livemode,
        amount_subtotal_cents: evidence.subtotalCents, amount_total_cents: evidence.totalCents, discount_cents: evidence.discountCents,
        payment_intent_id: evidence.paymentIntentId, payment_status: evidence.percent === 100 ? 'no_payment_required' : 'paid',
        completion_event_id: evidence.completionEventId, completed_at: evidence.completedAt,
      } });
      return { result: result.result, startsAt: result.starts_at, expiresAt: result.expires_at };
    },
  };
}

async function retrieveSessionEvidence(stripe: any, session: any, stored: StoredPromotionCheckout) {
  const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2, expand: ['data.discounts.discount'] });
  for (const line of lines.data) for (const entry of line.discounts ?? []) {
    const discount = entry.discount;
    if (!discount || typeof discount !== 'object') continue;
    const coupon = discount.source?.coupon ?? discount.coupon;
    const couponId = typeof coupon === 'string' ? coupon : coupon?.id;
    if (couponId) {
      const retrieved = await stripe.coupons.retrieve(couponId);
      if (discount.source) discount.source.coupon = retrieved; else discount.coupon = retrieved;
    }
  }
  return parsePromotionStripeSession(session, lines, stored);
}

export function promotionCompletionAdapter(db: any, stripe: any, live: boolean): PromotionFulfillmentDependencies {
  const base = promotionProviderAdapter(db, stripe, live);
  let stored: StoredPromotionCheckout | null = null;
  return {
    ...base,
    lookupCheckout: async id => { stored = await base.lookupCheckout(id); return stored; },
    retrieveSession: async id => {
      if (!stored) throw new Error('Recorded checkout required.');
      const session = await stripe.checkout.sessions.retrieve(id);
      return retrieveSessionEvidence(stripe, session, stored);
    },
  };
}
