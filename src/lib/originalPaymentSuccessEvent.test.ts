import { describe, expect, it, vi } from 'vitest';
import { findOriginalPaymentSuccessEvent } from '../../supabase/functions/_shared/originalPaymentSuccessEvent';
const created = 1700000000;
const event = (id = 'evt_Original', intent = 'pi_Original') => ({ id, object: 'event', type: 'payment_intent.succeeded',
  livemode: true, created: created + 400, data: { object: { id: intent, status: 'succeeded' } } });
describe('server-side original payment success lookup', () => {
  it('finds the actual success event across pages without using the current time', async () => {
    const list = vi.fn().mockResolvedValueOnce({ data: [event('evt_Other', 'pi_Other')], has_more: true })
      .mockResolvedValueOnce({ data: [event()], has_more: false });
    const result = await findOriginalPaymentSuccessEvent('pi_Original', created, created + 500, list);
    expect(result.created).toBe(created + 400);
    expect(list.mock.calls[1][0]).toEqual({ type: 'payment_intent.succeeded', limit: 100,
      created: { gte: created, lte: created + 500 }, starting_after: 'evt_Other' });
  });
  it('does not return a match until the bounded scan is complete', async () => {
    const list = vi.fn().mockResolvedValueOnce({ data: [event()], has_more: true })
      .mockResolvedValueOnce({ data: [event('evt_Duplicate')], has_more: false });
    await expect(findOriginalPaymentSuccessEvent('pi_Original', created, created + 500, list)).rejects.toThrow('inconsistent');
  });
  it.each([false, null, undefined])('rejects non-live or unknown mode (%s)', async (livemode) => {
    const list = vi.fn().mockResolvedValue({ data: [{ ...event(), livemode }], has_more: false });
    await expect(findOriginalPaymentSuccessEvent('pi_Original', created, created + 500, list)).rejects.toThrow();
  });
  it('fails closed when older provider evidence is no longer available', async () => {
    const list = vi.fn().mockResolvedValue({ data: [], has_more: false });
    await expect(findOriginalPaymentSuccessEvent('pi_Original', created, created + 60 * 86400, list)).rejects.toThrow('unavailable');
    expect(list.mock.calls[0][0].created.gte).toBe(created + 30 * 86400);
  });
  it('bounds pagination and rejects an incomplete scan even with a match', async () => {
    let page = 0;
    const list = vi.fn(async () => ({ data: [event(`evt_Page${++page}`, page === 1 ? 'pi_Original' : 'pi_Other')], has_more: true }));
    await expect(findOriginalPaymentSuccessEvent('pi_Original', created, created + 500, list)).rejects.toThrow('incomplete');
    expect(list).toHaveBeenCalledTimes(10);
  });
  it('rejects repeated cursor pages and propagates provider failure without fabricating evidence', async () => {
    const repeated = vi.fn().mockResolvedValue({ data: [event('evt_Other', 'pi_Other')], has_more: true });
    await expect(findOriginalPaymentSuccessEvent('pi_Original', created, created + 500, repeated)).rejects.toThrow();
    const unavailable = vi.fn().mockRejectedValue(new Error('Provider unavailable'));
    await expect(findOriginalPaymentSuccessEvent('pi_Original', created, created + 500, unavailable)).rejects.toThrow('Provider unavailable');
  });
});
