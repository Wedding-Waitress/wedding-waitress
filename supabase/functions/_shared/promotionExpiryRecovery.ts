type Client = { rpc(name: string, parameters: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
type Provider = { checkout: { sessions: { retrieve(id: string): Promise<any> } }; paymentIntents?: { retrieve(id: string, options?: unknown): Promise<any> } };

/** A failed checkout can have a PaymentIntent. It is releasable only after a
 * fresh retrieval confirms cancellation, zero received funds and no paid charge. */
export async function reconcileExpiredPromotionSession(db: Client, stripe: Provider, reservationId: string, session: any, live = true) {
  if (!session || session.status !== 'expired' || session.payment_status !== 'unpaid' || session.mode !== 'payment' || session.livemode !== live) throw new Error('Confirmed unpaid expiry required.');
  const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const evidence: Record<string, unknown> = { id: session.id, status: session.status, payment_status: session.payment_status,
    payment_intent: session.payment_intent, mode: session.mode, livemode: session.livemode, customer, metadata: session.metadata };
  if (session.payment_intent !== null) {
    if (typeof session.payment_intent !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(session.payment_intent) || !stripe.paymentIntents) throw new Error('Expired payment identity is uncertain.');
    const payment = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ['latest_charge'] });
    const paymentCustomer = typeof payment?.customer === 'string' ? payment.customer : payment?.customer?.id;
    if (payment?.id !== session.payment_intent || payment.status !== 'canceled' || payment.amount_received !== 0
      || payment.livemode !== live || paymentCustomer !== customer) throw new Error('Expired payment must be canceled with no received funds.');
    const charge = payment.latest_charge;
    if (charge !== null && (!charge || typeof charge !== 'object' || charge.paid !== false || charge.livemode !== live
      || (typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id) !== payment.id
      || (typeof charge.customer === 'string' ? charge.customer : charge.customer?.id) !== customer)) throw new Error('Expired payment charge is uncertain.');
    evidence.expired_payment_intent = { id: payment.id, status: payment.status, amount_received: payment.amount_received,
      customer, livemode: payment.livemode, paid_charge: false };
  }
  const response = await db.rpc('reconcile_expired_promotion_checkout', { p_reservation: reservationId, p_evidence: evidence });
  if (response.error) throw new Error('Expired checkout release could not be confirmed.');
  return response.data as { result?: string } | null;
}

/** On demand, recover a full campaign's or the caller's abandoned holds. No session is expired,
 * charged or created here. Bound sessions require Stripe's retrieved expiry.
 * Stale unbound attempts have never exposed a client secret; SQL checks their
 * renewable lease and binding state under the same locks as reservation/binding. */
export async function recoverExpiredPromotionCapacity(db: Client, stripe: Provider, userId: string, code: string, live = true) {
  const result = await db.rpc('promotion_expiry_candidates', { p_user: userId, p_code: code, p_live: live });
  // At most 100 target-campaign holds plus the caller's one other pending hold.
  if (result.error || !Array.isArray(result.data) || result.data.length > 101) throw new Error('Promotion capacity could not be checked.');
  const candidates = result.data as { id?: unknown; session_id?: unknown; started_at?: unknown; target_full?: unknown; campaign_hold?: unknown }[];
  if (candidates.some(row => typeof row?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(row.id)
    || (row.session_id === null
      ? typeof row.started_at !== 'string' || !Number.isFinite(Date.parse(row.started_at))
      : typeof row.session_id !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(row.session_id)))) throw new Error('Recorded promotion capacity is invalid.');
  let checked = 0, released = 0, campaignReleased = 0;
  const needsCampaignSlot = candidates.some(row => row.target_full === true);
  for (let offset = 0; offset < candidates.length; offset += 10) {
    const rows = await Promise.all(candidates.slice(offset, offset + 10).map(async candidate => {
      checked++;
      if (candidate.session_id === null) return { candidate, session: null };
      try {
        const session = await stripe.checkout.sessions.retrieve(candidate.session_id as string);
        if (session?.id !== candidate.session_id || session.status !== 'expired' || session.payment_status !== 'unpaid'
          || session.mode !== 'payment' || session.livemode !== live) return null;
        return { candidate, session };
      } catch { return null; } // An uncertain provider state never frees capacity.
    }));
    for (const row of rows) {
      if (!row) continue;
      const { candidate, session } = row;
      if (session === null) {
        const response = await db.rpc('release_unbound_promotion_reservation', { p_reservation: candidate.id, p_started_at: candidate.started_at });
        if (!response.error && (response.data as { result?: unknown } | null)?.result === 'released') { released++; if (candidate.campaign_hold === true) campaignReleased++; }
        continue;
      }
      try { if ((await reconcileExpiredPromotionSession(db, stripe, candidate.id as string, session, live))?.result === 'released') { released++; if (candidate.campaign_hold === true) campaignReleased++; } }
      catch { /* Keep capacity reserved unless both provider and database agree. */ }
    }
    // Caller-specific cleanup may happen first. If the target was full, keep
    // checking until its shared capacity is recovered as well.
    if (released && (!needsCampaignSlot || campaignReleased)) break;
  }
  return { checked, released };
}
