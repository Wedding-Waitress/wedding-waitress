export interface PromotionWebhookDependencies {
  verify(rawBody: string, signature: string): Promise<{ livemode: boolean; type: string; data: { object: unknown } }>;
  fulfill(sessionId: string): Promise<unknown>;
}

/** Signature verification is required before any event can reach fulfillment. */
export function promotionWebhookHandler(deps: PromotionWebhookDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('Signature required', { status: 400 });
    let event;
    try { event = await deps.verify(await req.text(), signature); }
    catch { return new Response('Invalid webhook signature', { status: 400 }); }
    if (event.livemode !== true) return new Response('Test events cannot grant production access', { status: 400 });
    if (event.type !== 'checkout.session.completed') return new Response('Ignored', { status: 200 });
    const object = event.data?.object;
    if (!object || typeof object !== 'object') return new Response('Invalid checkout identity', { status: 400 });
    const session = object as { id?: unknown; metadata?: Record<string, string> | null };
    if (session?.metadata?.promotion_version !== '1') return new Response('Ignored', { status: 200 });
    if (typeof session.id !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(session.id)) return new Response('Invalid checkout identity', { status: 400 });
    try {
      await deps.fulfill(session.id);
      return new Response('Verified', { status: 200 });
    } catch { return new Response('Fulfillment could not be confirmed', { status: 503 }); }
  };
}
