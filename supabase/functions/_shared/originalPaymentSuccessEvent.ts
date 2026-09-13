/** Read-only provider lookup. Never substitute verification time or charge creation.
 * The caller supplies a SERVER-side Stripe events.list adapter, never browser data.
 * Stripe retains listable events for 30 days; absent older evidence needs the
 * immutable fulfillment ledger / reviewed signed-webhook evidence, not a guessed date.
 */
type ProviderEvent = { id: string; object: string; type: string; livemode: boolean;
  created: number; data: { object: { id?: string; status?: string } } };
type EventPage = { data: ProviderEvent[]; has_more: boolean };
type EventQuery = { type: 'payment_intent.succeeded'; limit: 100;
  created: { gte: number; lte: number }; starting_after?: string };

export async function findOriginalPaymentSuccessEvent(
  intentId: string, intentCreated: number, serverNow: number,
  listEvents: (query: EventQuery) => Promise<EventPage>,
): Promise<ProviderEvent> {
  if (!/^pi_[A-Za-z0-9]+$/.test(intentId) || !Number.isSafeInteger(intentCreated)
    || !Number.isSafeInteger(serverNow) || intentCreated <= 0 || serverNow < intentCreated) {
    throw new Error('Original successful-payment evidence is unavailable');
  }
  const query: EventQuery = { type: 'payment_intent.succeeded', limit: 100,
    created: { gte: Math.max(intentCreated, serverNow - 30 * 86400), lte: serverNow } };
  const seen = new Set<string>();
  let found: ProviderEvent | null = null;
  // Bounded work is deliberate: an incomplete scan must fail closed, not pick
  // a potentially later transition or run an unbounded provider request loop.
  for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
    const page = await listEvents({ ...query });
    if (!page || !Array.isArray(page.data) || typeof page.has_more !== 'boolean'
      || page.data.length > 100 || page.has_more && page.data.length === 0) {
      throw new Error('Original successful-payment evidence is unavailable');
    }
    for (const event of page.data) {
      if (!event || !/^evt_[A-Za-z0-9]+$/.test(event.id) || seen.has(event.id)) {
        throw new Error('Original successful-payment evidence is unavailable');
      }
      seen.add(event.id);
      if (event.data?.object?.id !== intentId) continue;
      if (event.object !== 'event' || event.type !== query.type || event.livemode !== true
        || event.data.object.status !== 'succeeded' || !Number.isSafeInteger(event.created)
        || event.created < query.created.gte || event.created > serverNow || found) {
        throw new Error('Original successful-payment evidence is inconsistent');
      }
      found = event;
    }
    if (!page.has_more) {
      if (found) return found;
      throw new Error('Original successful-payment evidence is unavailable');
    }
    query.starting_after = page.data[page.data.length - 1].id;
  }
  throw new Error('Original successful-payment evidence scan is incomplete');
}
