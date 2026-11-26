import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const backend = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: backend.rpc, from: backend.from } }));
import { useEventMediaGallery } from './useEventMediaGallery';
import { clearAllCaches } from '@/lib/cacheRegistry';
let saved: Record<string, unknown>;
let exists: boolean;
beforeEach(() => {
  vi.resetAllMocks(); clearAllCaches(); exists = true;
  saved = { gallery_id: 'gallery', photo_booth_enabled: false, slideshow_enabled: false, guest_upload_enabled: false, gallery_view_enabled: false, guestbook_text_enabled: false };
  backend.rpc.mockImplementation(async (name: string) => {
    if (name === 'ensure_event_media_gallery') exists = true;
    return { data: name === 'get_event_media_gallery_host' ? (exists ? [{ ...saved }] : []) : null, error: null };
  });
  backend.from.mockReturnValue({ update: backend.update });
  backend.update.mockReturnValue({ eq: backend.eq });
  backend.eq.mockReturnValue({ select: backend.select });
  backend.select.mockReturnValue({ maybeSingle: backend.maybeSingle });
  backend.maybeSingle.mockImplementation(async () => {
    Object.assign(saved, backend.update.mock.lastCall![0]);
    return { data: { ...saved }, error: null };
  });
});
const cases = [
  ['photo_booth_enabled', 'setPhotoBoothEnabled'], ['slideshow_enabled', 'setSlideshowEnabled'],
  ['guest_upload_enabled', 'setGuestFeature'], ['gallery_view_enabled', 'setGuestFeature'], ['guestbook_text_enabled', 'setGuestFeature'],
] as const;
it.each(cases)('persists %s on and off, scoped to the selected event', async (field, method) => {
  const view = renderHook(() => useEventMediaGallery('event', { loadItems: false }));
  await waitFor(() => expect(view.result.current.meta).not.toBeNull());
  for (const enabled of [true, false]) {
    await act(async () => { if (method === 'setGuestFeature') await view.result.current.setGuestFeature(field as 'guest_upload_enabled', enabled); else await view.result.current[method](enabled); });
    expect(backend.from).toHaveBeenCalledWith('event_media_galleries');
    expect(backend.eq).toHaveBeenLastCalledWith('event_id', 'event');
    expect(backend.select).toHaveBeenLastCalledWith(field);
    expect(view.result.current.meta?.[field]).toBe(enabled);
    expect(saved[field]).toBe(enabled);
  }
  view.unmount(); clearAllCaches();
  const reloaded = renderHook(() => useEventMediaGallery('event', { loadItems: false }));
  await waitFor(() => expect(reloaded.result.current.meta?.[field]).toBe(false));
});
it.each([{ data: null, error: null }, { data: null, error: { message: 'Permission denied' } }])('rejects missing or forbidden rows without changing the switch', async response => {
  const view = renderHook(() => useEventMediaGallery('event', { loadItems: false }));
  await waitFor(() => expect(view.result.current.meta).not.toBeNull());
  backend.maybeSingle.mockResolvedValue(response);
  await act(async () => { await expect(view.result.current.setPhotoBoothEnabled(true)).rejects.toThrow(); });
  expect(view.result.current.meta?.photo_booth_enabled).toBe(false);
});
it('keeps switch state unchanged on a network failure', async () => {
  const view = renderHook(() => useEventMediaGallery('event', { loadItems: false }));
  await waitFor(() => expect(view.result.current.meta).not.toBeNull());
  backend.maybeSingle.mockRejectedValue(new Error('Offline'));
  await act(async () => { await expect(view.result.current.setSlideshowEnabled(true)).rejects.toThrow('Offline'); });
  expect(view.result.current.meta?.slideshow_enabled).toBe(false);
});
it('initialises a new event gallery before saving its features', async () => {
  exists = false;
  const view = renderHook(() => useEventMediaGallery('new-event', { loadItems: false }));
  await waitFor(() => expect(view.result.current.meta).not.toBeNull());
  expect(backend.rpc).toHaveBeenCalledWith('ensure_event_media_gallery', { _event_id: 'new-event' });
  await act(async () => { await view.result.current.setPhotoBoothEnabled(true); await view.result.current.setSlideshowEnabled(true); });
  expect(saved.photo_booth_enabled).toBe(true); expect(saved.slideshow_enabled).toBe(true);
});
it('does not report success when the returned state differs from the requested state', async () => {
  const view = renderHook(() => useEventMediaGallery('event', { loadItems: false }));
  await waitFor(() => expect(view.result.current.meta).not.toBeNull());
  backend.maybeSingle.mockResolvedValue({ data: { slideshow_enabled: false }, error: null });
  await act(async () => { await expect(view.result.current.setSlideshowEnabled(true)).rejects.toThrow('could not be saved'); });
  expect(view.result.current.meta?.slideshow_enabled).toBe(false);
});
