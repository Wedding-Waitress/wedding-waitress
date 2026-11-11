import { afterEach, expect, it, vi } from 'vitest';
import { shareGuestLookup } from './guestLookupShare';
afterEach(() => vi.unstubAllGlobals());
it('shares the public seating URL without invitation credentials or other query data', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share });
  expect(await shareGuestLookup('Event', 'https://example.test/s/event?invite=private-token&tab=search#details')).toBe('shared');
  expect(share).toHaveBeenCalledWith({ title: 'Event', url: 'https://example.test/s/event' });
});
it('copies the public URL when native sharing is unavailable', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  expect(await shareGuestLookup('Event', 'https://example.test/s/event?invite=private-token')).toBe('copied');
  expect(writeText).toHaveBeenCalledWith('https://example.test/s/event');
});
it('propagates a dismissed native share without copying the link', async () => {
  const writeText = vi.fn();
  const cancelled = new DOMException('Cancelled', 'AbortError');
  vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(cancelled), clipboard: { writeText } });
  await expect(shareGuestLookup('Event', 'https://example.test/s/event')).rejects.toBe(cancelled);
  expect(writeText).not.toHaveBeenCalled();
});
it('reports unavailable or denied clipboard access', async () => {
  vi.stubGlobal('navigator', {});
  await expect(shareGuestLookup('Event', 'https://example.test/s/event')).rejects.toThrow('unavailable');
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
  await expect(shareGuestLookup('Event', 'https://example.test/s/event')).rejects.toThrow('Denied');
});
