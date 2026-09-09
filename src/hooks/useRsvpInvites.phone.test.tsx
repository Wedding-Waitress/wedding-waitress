import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRsvpInvites } from './useRsvpInvites';

const mocks = vi.hoisted(() => ({ from: vi.fn(), toast: vi.fn(), fetch: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://example.test',
  supabase: { from: mocks.from, auth: { getSession: async () => ({ data: { session: { access_token: 'test-only' } } }) } },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/guestPhone', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/guestPhone')>();
  return { ...actual, normalizeGuestPhone: (value: string) => actual.normalizeGuestPhone(value, 'AU') };
});

describe('SMS recipient phone normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ sent: 1, failed: 0, skipped: 0 }) });
  });

  function setup(mobile: string, updateError: object | null = null) {
    const updateId = vi.fn().mockResolvedValue({ error: updateError });
    const updateEvent = vi.fn().mockReturnValue({ eq: updateId });
    const update = vi.fn().mockReturnValue({ eq: updateEvent });
    const ids = vi.fn().mockResolvedValue({ data: [{ id: 'guest-1', mobile }], error: null });
    const event = vi.fn().mockReturnValue({ in: ids });
    mocks.from.mockReturnValue({ select: () => ({ eq: event }), update });
    return { update, updateEvent, updateId, ids, event };
  }

  it('saves an Australian number for only the intended event and guest before sending', async () => {
    const calls = setup('0411 569 505');
    const { result } = renderHook(() => useRsvpInvites());
    await act(async () => { await result.current.sendSmsInvites('event-1', ['guest-1']); });
    expect(calls.event).toHaveBeenCalledWith('event_id', 'event-1');
    expect(calls.ids).toHaveBeenCalledWith('id', ['guest-1']);
    expect(calls.update).toHaveBeenCalledWith({ mobile: '+61411569505' });
    expect(calls.updateEvent).toHaveBeenCalledWith('event_id', 'event-1');
    expect(calls.updateId).toHaveBeenCalledWith('id', 'guest-1');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not send if the number is incomplete', async () => {
    const calls = setup('0411');
    const { result } = renderHook(() => useRsvpInvites());
    await act(async () => { await result.current.sendSmsInvites('event-1', ['guest-1']); });
    expect(calls.update).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('does not send if saving the corrected number fails', async () => {
    setup('0411569505', { message: 'Save failed' });
    const { result } = renderHook(() => useRsvpInvites());
    await act(async () => { await result.current.sendSmsInvites('event-1', ['guest-1']); });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
