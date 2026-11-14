import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveViewVisibility } from './useLiveViewVisibility';
import { useGuestSongRequestSettings } from './useGuestSongRequestSettings';
import { useLiveViewModuleSettings } from './useLiveViewModuleSettings';
import { VideoWishesConfigCard } from '@/components/Dashboard/QRCode/VideoWishesConfigCard';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), toast: vi.fn(), sync: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/eventHeroImage', () => ({ syncEventHeroImage: mocks.sync }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
let reads: Record<string, number>;
let saves: { table: string; id: string; patch: any; request: ReturnType<typeof deferred<any>> }[];
const records: Record<string, any> = {
  live_view_settings: { event_id: 'event-a', show_rsvp_invite: true, show_menu: false },
  guest_song_request_settings: { event_id: 'event-a', enabled: false, max_requests_per_guest: 3 },
  live_view_module_settings: { event_id: 'event-a', hero_image_config: { enabled: true, file_url: 'existing-photo' } },
  video_wishes_settings: { event_id: 'event-a', enabled: false },
};
function wrapper({ children }: React.PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks(); reads = {}; saves = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  mocks.sync.mockResolvedValue(undefined);
  mocks.from.mockImplementation((table: string) => {
    let id = ''; let patch: any;
    const builder: any = {
      select: () => builder,
      eq: (_key: string, value: string) => { id = value; return builder; },
      update: (value: any) => { patch = value; return builder; },
      upsert: (value: any) => { patch = value; id = value.event_id; return builder; },
      maybeSingle: async () => { reads[table] = (reads[table] || 0) + 1; return { data: structuredClone(records[table]), error: null }; },
      single: () => { const request = deferred<any>(); saves.push({ table, id, patch, request }); return request.promise; },
    };
    return builder;
  });
});
describe('Live View settings persistence adapters', () => {
  it('loads saved Photo/Logo settings without waiting for image synchronization', async () => {
    const sync = deferred<boolean>(); mocks.sync.mockReturnValue(sync.promise);
    const hook = renderHook(() => useLiveViewModuleSettings('event-a'), { wrapper });
    await waitFor(() => expect(hook.result.current.settings?.hero_image_config.enabled).toBe(true));
    expect(hook.result.current.loading).toBe(false);
    expect(reads.live_view_module_settings).toBe(1);
    await act(async () => sync.resolve(false));
    expect(reads.live_view_module_settings).toBe(1);
  });

  it('refreshes the saved image only if background sync changed it', async () => {
    mocks.sync.mockResolvedValue(true);
    const hook = renderHook(() => useLiveViewModuleSettings('event-a'), { wrapper });
    await waitFor(() => expect(reads.live_view_module_settings).toBe(2));
    expect(hook.result.current.settings?.event_id).toBe('event-a');
    expect(mocks.sync).toHaveBeenCalledOnce();
  });

  it('keeps saved Photo/Logo settings visible and retries a failed background sync', async () => {
    mocks.sync.mockRejectedValueOnce(new Error('Temporary sync failure')).mockResolvedValueOnce(false);
    const hook = renderHook(() => useLiveViewModuleSettings('event-a'), { wrapper });
    await waitFor(() => expect(hook.result.current.photoSyncError).toBe(true));
    expect(hook.result.current.settings?.hero_image_config.enabled).toBe(true);
    act(() => hook.result.current.retrySettings());
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(2));
    expect(hook.result.current.photoSyncError).toBe(false);
  });
  it('updates visibility immediately and saves only the selected event without a refetch', async () => {
    const hook = renderHook(() => useLiveViewVisibility('event-a'), { wrapper });
    await waitFor(() => expect(hook.result.current.settings?.show_rsvp_invite).toBe(true));
    act(() => hook.result.current.updateVisibility('show_rsvp_invite', false));
    expect(hook.result.current.settings?.show_rsvp_invite).toBe(false);
    expect(saves[0]).toMatchObject({ table: 'live_view_settings', id: 'event-a', patch: { show_rsvp_invite: false } });
    await act(async () => saves[0].request.resolve({ data: { ...records.live_view_settings, show_rsvp_invite: false }, error: null }));
    expect(reads.live_view_settings).toBe(1);
  });
  it('immediately updates song requests and restores the confirmed value on a database error', async () => {
    const hook = renderHook(() => useGuestSongRequestSettings('event-a'), { wrapper });
    await waitFor(() => expect(hook.result.current.settings).toBeDefined());
    act(() => hook.result.current.updateSettings({ enabled: true }));
    expect(hook.result.current.settings?.enabled).toBe(true);
    await act(async () => saves[0].request.resolve({ data: null, error: new Error('Denied') }));
    expect(hook.result.current.settings?.enabled).toBe(false);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
  it('allows rapid photo visibility changes while a previous module save is pending', async () => {
    const hook = renderHook(() => useLiveViewModuleSettings('event-a'), { wrapper });
    await waitFor(() => expect(hook.result.current.settings).not.toBeNull());
    act(() => { void hook.result.current.updateModuleConfig('hero_image_config', { enabled: false, file_url: 'existing-photo' }); });
    expect(hook.result.current.settings?.hero_image_config.enabled).toBe(false);
    act(() => { void hook.result.current.updateModuleConfig('hero_image_config', { enabled: true, file_url: 'existing-photo' }); });
    expect(hook.result.current.settings?.hero_image_config.enabled).toBe(true);
    expect(saves).toHaveLength(1);
    await act(async () => saves[0].request.resolve({ data: { ...records.live_view_module_settings, hero_image_config: { enabled: false, file_url: 'existing-photo' } }, error: null }));
    expect(hook.result.current.settings?.hero_image_config.enabled).toBe(true);
    expect(saves).toHaveLength(2);
    await act(async () => saves[1].request.resolve({ data: records.live_view_module_settings, error: null }));
    expect(mocks.sync).toHaveBeenCalledTimes(1);
  });
  it('shows Video Wishes ON immediately while gallery provisioning is still pending, then recovers if provisioning fails', async () => {
    const provision = deferred<any>(); mocks.rpc.mockReturnValue(provision.promise);
    render(<VideoWishesConfigCard eventId="event-a" />, { wrapper });
    expect(screen.getByRole('status')).toHaveTextContent('Loading saved settings');
    const toggle = await screen.findByRole('switch');
    fireEvent.click(toggle);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Displayed on app')).toBeInTheDocument();
    expect(saves).toHaveLength(0);
    await act(async () => provision.resolve({ error: new Error('Gallery unavailable') }));
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByText('Not displayed on app')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not update Video Wishes' }));
  });
});
