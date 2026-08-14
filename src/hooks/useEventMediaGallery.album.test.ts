import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({
  album: 'Ceremony' as string | null,
  rpc: vi.fn(),
  createSignedUrls: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: backend.rpc,
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
    }),
    removeChannel: vi.fn(),
    storage: {
      from: () => ({
        createSignedUrls: backend.createSignedUrls,
        createSignedUrl: backend.createSignedUrl,
      }),
    },
  },
}));

import { useEventMediaGallery } from './useEventMediaGallery';
import { clearAllCaches } from '@/lib/cacheRegistry';

const storedItem = () => ({
  id: 'media-1',
  kind: 'photo',
  mime_type: 'image/jpeg',
  byte_size: 1024,
  duration_sec: null,
  storage_path: 'event-1/media-1.jpg',
  uploader_name: 'Guest',
  caption: null,
  guestbook_message: null,
  uploaded_at: '2026-08-13T00:00:00Z',
  moderation_status: 'approved',
  album: backend.album,
  is_guestbook: false,
  is_photo_booth: false,
  is_photo_booth_strip: false,
  source_category: 'guest_upload',
});

describe('useEventMediaGallery album persistence', () => {
  beforeEach(() => {
    clearAllCaches();
    backend.album = 'Ceremony';
    backend.rpc.mockReset();
    backend.createSignedUrls.mockReset();
    backend.createSignedUrl.mockReset();
    backend.createSignedUrls.mockResolvedValue({
      data: [{ signedUrl: 'https://example.com/media-1.jpg' }],
      error: null,
    });
    backend.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/media-1.jpg' }, error: null });
    backend.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'get_event_media_gallery_host') {
        return { data: [{ gallery_id: 'gallery-1', event_id: 'event-1', is_open: true }], error: null };
      }
      if (name === 'get_event_media_items_host') return { data: [storedItem()], error: null };
      if (name === 'set_event_media_album') {
        backend.album = args._album as string | null;
        return { data: null, error: null };
      }
      return { data: null, error: null };
    });
  });

  it('hydrates a remounted feature route from the last validated gallery metadata', async () => {
    const first = renderHook(() => useEventMediaGallery('event-1'));
    await waitFor(() => expect(first.result.current.meta?.gallery_id).toBe('gallery-1'));
    first.unmount();

    const next = renderHook(() => useEventMediaGallery('event-1'));
    expect(next.result.current.meta?.gallery_id).toBe('gallery-1');
    expect(next.result.current.items).toHaveLength(1);
    next.unmount();
  });

  it('saves through the existing RPC and reloads the changed album after a fresh mount', async () => {
    const first = renderHook(() => useEventMediaGallery('event-1'));
    await waitFor(() => expect(first.result.current.items).toHaveLength(1));

    await act(async () => {
      await first.result.current.setAlbum('media-1', 'Reception');
    });

    expect(first.result.current.items[0].album).toBe('Reception');
    expect(backend.rpc).toHaveBeenCalledWith('set_event_media_album', {
      _item_id: 'media-1',
      _album: 'Reception',
    });

    first.unmount();
    const refreshed = renderHook(() => useEventMediaGallery('event-1'));
    await waitFor(() => expect(refreshed.result.current.items[0]?.album).toBe('Reception'));
    refreshed.unmount();
  });
});
