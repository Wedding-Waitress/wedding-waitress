import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({
  album: 'Ceremony' as string | null,
  rpc: vi.fn(),
  createSignedUrls: vi.fn(),
  createSignedUrl: vi.fn(),
  mediaChange: null as (()=>void) | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: backend.rpc,
    channel: () => ({
      on(_event:unknown,_filter:unknown,handler:()=>void) { backend.mediaChange=handler;return this; },
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
    backend.mediaChange=null;
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

  it('does not fetch media rows or sign media URLs for the landing-page metadata view', async () => {
    const landing = renderHook(() => useEventMediaGallery('event-1', { loadItems: false }));

    await waitFor(() => expect(landing.result.current.meta?.gallery_id).toBe('gallery-1'));
    expect(backend.rpc).not.toHaveBeenCalledWith('get_event_media_items_host', expect.anything());
    expect(backend.createSignedUrls).not.toHaveBeenCalled();
    expect(backend.createSignedUrl).not.toHaveBeenCalled();
    landing.unmount();
  });

  it('does not fan out a failed signing batch into per-item retries', async () => {
    backend.createSignedUrls.mockResolvedValueOnce({data:null,error:{message:'Storage timed out'}});
    const view=renderHook(()=>useEventMediaGallery('event-1'));
    await waitFor(()=>expect(view.result.current.error).toBe('Storage timed out'));
    expect(backend.createSignedUrl).not.toHaveBeenCalled();
    await act(async()=>{await view.result.current.refresh();});
    expect(view.result.current.items).toHaveLength(1);
    expect(view.result.current.error).toBeNull();
    view.unmount();
  });

  it('coalesces thirteen realtime changes into one read and one follow-up', async () => {
    const view=renderHook(()=>useEventMediaGallery('event-1'));
    await waitFor(()=>expect(view.result.current.items).toHaveLength(1));
    let finish!:(value:unknown)=>void;
    backend.rpc.mockClear();
    backend.rpc.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    await act(async()=>{for(let i=0;i<13;i++)backend.mediaChange?.();});
    expect(backend.rpc.mock.calls.filter(call=>call[0]==='get_event_media_items_host')).toHaveLength(1);
    await act(async()=>{finish({data:[storedItem()],error:null});});
    await waitFor(()=>expect(backend.rpc.mock.calls.filter(call=>call[0]==='get_event_media_items_host')).toHaveLength(2));
    expect(view.result.current.items).toHaveLength(1);
    view.unmount();
  });

  it('queues a fresh recording query when Refresh is pressed during an older read', async () => {
    const view = renderHook(() => useEventMediaGallery('event-1'));
    await waitFor(() => expect(view.result.current.items).toHaveLength(1));
    backend.rpc.mockClear();
    let finish!: (value: unknown) => void;
    backend.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => { first = view.result.current.refreshRecordings(); });
    await act(async () => { second = view.result.current.refreshRecordings(); });
    expect(backend.rpc.mock.calls.filter(call => call[0] === 'get_event_media_items_host')).toHaveLength(1);
    await act(async () => { finish({ data: [storedItem()], error: null }); await Promise.all([first, second]); });
    expect(backend.rpc.mock.calls.filter(call => call[0] === 'get_event_media_items_host')).toHaveLength(2);
    expect(backend.rpc).toHaveBeenCalledWith('get_event_media_items_host', { _event_id: 'event-1' });
    view.unmount();
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
