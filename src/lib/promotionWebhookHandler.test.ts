import { expect, it, vi } from 'vitest';
import { promotionWebhookHandler } from '../../supabase/functions/_shared/promotionWebhookHandler';

const request = () => new Request('http://localhost/webhook', { method: 'POST', body: 'signed fixture', headers: { 'stripe-signature': 'fixture' } });
function fixture(type = 'checkout.session.completed', paymentStatus = 'paid', live = true) {
  const fulfill = vi.fn().mockResolvedValue({});
  const handler = promotionWebhookHandler({ fulfill, verify: vi.fn().mockResolvedValue({ livemode: live, type,
    data: { object: { id: 'cs_fixture', payment_status: paymentStatus, metadata: { promotion_version: '1' } } } }) });
  return { handler, fulfill };
}
it.each(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])('retrieves full fulfillment evidence after %s', async type => {
  const { handler, fulfill } = fixture(type);
  expect((await handler(request())).status).toBe(200);
  expect(fulfill).toHaveBeenCalledWith('cs_fixture');
});
it('acknowledges pending completion without granting access', async () => {
  const { handler, fulfill } = fixture('checkout.session.completed', 'unpaid');
  expect((await handler(request())).status).toBe(200);
  expect(fulfill).not.toHaveBeenCalled();
});
it('handles completed no-cost checkout through the same evidence boundary', async () => {
  const { handler, fulfill } = fixture('checkout.session.completed', 'no_payment_required');
  expect((await handler(request())).status).toBe(200);
  expect(fulfill).toHaveBeenCalledOnce();
});
it.each(['checkout.session.async_payment_failed', 'checkout.session.expired'])('does not fulfill %s', async type => {
  const { handler, fulfill } = fixture(type, 'unpaid');
  expect((await handler(request())).status).toBe(200);
  expect(fulfill).not.toHaveBeenCalled();
});
it('rejects sandbox deliveries from the production handler', async () => {
  const { handler, fulfill } = fixture('checkout.session.async_payment_succeeded', 'paid', false);
  expect((await handler(request())).status).toBe(400);
  expect(fulfill).not.toHaveBeenCalled();
});
it('keeps unconfirmed delayed fulfillment retryable', async () => {
  const { handler, fulfill } = fixture('checkout.session.async_payment_succeeded');
  fulfill.mockRejectedValue(new Error('database unavailable'));
  expect((await handler(request())).status).toBe(503);
});
it('rejects invalid signatures before inspecting or fulfilling a session', async () => {
  const fulfill = vi.fn();
  const handler = promotionWebhookHandler({ fulfill, verify: vi.fn().mockRejectedValue(new Error('invalid')) });
  expect((await handler(request())).status).toBe(400);
  expect(fulfill).not.toHaveBeenCalled();
});
