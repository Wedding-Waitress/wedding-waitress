import { expect, it, vi } from 'vitest';
import { resolveVideoWishesContext } from '../../supabase/functions/_shared/video-wishes-context';

const setup = (overrides: Record<string, unknown> = {}) => {
  const values: Record<string, unknown> = {
    events: { id: 'event', user_id: 'owner', name: 'Synthetic Event', date: '2027-01-01' },
    is_account_operational: true, subscription_allows_event_edit: true,
    video_wishes_settings: { enabled: true },
    event_media_galleries: { id: 'gallery', is_open: true, password_enabled: false },
    event_media_limits: { max_video_bytes: 104857600, max_video_duration_sec: 120 },
    ...overrides,
  };
  const pending = new Map<string, () => void>();
  const read = vi.fn((key: string) => key === 'events'
    ? Promise.resolve({ data: values[key], error: null })
    : new Promise(resolve => pending.set(key, () => resolve({ data: values[key], error: null }))));
  const db = {
    rpc: (key: string) => read(key),
    from: (key: string) => {
      const query: any = { select: () => query, eq: () => query, maybeSingle: () => read(key) };
      return query;
    },
  };
  return { db, pending };
};
it('starts all five independent checks without waiting for any to finish', async () => {
  const { db, pending } = setup();
  const result = resolveVideoWishesContext(db, 'synthetic-event');
  await Promise.resolve();
  expect(pending.size).toBe(5);
  for (const finish of pending.values()) finish();
  expect((await result).maxSeconds).toBe(120);
});
it.each([
  ['is_account_operational', false, 'unavailable'],
  ['subscription_allows_event_edit', false, 'unavailable'],
  ['video_wishes_settings', { enabled: false }, 'not displayed'],
  ['event_media_galleries', { is_open: false }, 'closed'],
  ['event_media_limits', null, 'limits'],
])('still denies context when %s fails', async (key, value, message) => {
  const { db, pending } = setup({ [key as string]: value });
  const result = resolveVideoWishesContext(db, 'synthetic-event');
  const denied = expect(result).rejects.toThrow(message as string);
  await Promise.resolve();
  for (const finish of pending.values()) finish();
  await denied;
});
