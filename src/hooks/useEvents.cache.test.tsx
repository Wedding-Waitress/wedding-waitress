import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userId: 'owner-a',
  rows: [{ id: 'event-a', user_id: 'owner-a', name: 'A' }],
  rpc: vi.fn(),
  eventsSelect: vi.fn(),
  authCallback: undefined as undefined | ((event: string, session: { user: { id: string } } | null) => void),
}));

vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: mocks.userId } } }),
        onAuthStateChange: (callback: typeof mocks.authCallback) => {
          mocks.authCallback = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
      rpc: mocks.rpc,
      from: () => ({ select: mocks.eventsSelect }),
      channel: () => channel,
      removeChannel: vi.fn(),
    },
  };
});
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: null, updateDisplayCountdownEvent: vi.fn() }) }));
vi.mock('@/lib/eventImage', () => ({ isEventImageBackendUnavailable: () => false, isEventImageZoomBackendUnavailable: () => false }));
vi.mock('@/lib/eventDeletionWithImage', () => ({ deleteOwnedEventWithImage: vi.fn() }));
vi.mock('@/lib/eventHeroImage', () => ({ syncEventHeroImage: vi.fn() }));

import { clearAllCaches, setCacheUserId } from '@/lib/cacheRegistry';
import { useEvents } from './useEvents';
import { notifyEventCreated } from '@/lib/eventCreationEvents';

describe('useEvents warm dashboard cache', () => {
  it('invalidates the warm cache while no dashboard is mounted and ignores another account notification', async () => {
    const first = renderHook(() => useEvents());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    first.unmount();
    act(() => notifyEventCreated('owner-b', 'event-b'));
    const unchanged = renderHook(() => useEvents());
    expect(unchanged.result.current.loaded).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    unchanged.unmount();
    mocks.rows = [...mocks.rows, { id:'new-event',user_id:'owner-a',name:'New' }];
    mocks.rpc.mockResolvedValue({data:mocks.rows,error:null});
    mocks.eventsSelect.mockResolvedValue({data:mocks.rows,error:null});
    act(() => notifyEventCreated('owner-a','new-event'));
    const returned = renderHook(() => useEvents());
    expect(returned.result.current.loaded).toBe(false);
    await waitFor(() => expect(returned.result.current.events.map(row=>row.id)).toEqual(['event-a','new-event']));
  });

  it('rejects an older in-flight response and refetches after creation for all mounted consumers', async () => {
    const first = renderHook(() => useEvents());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    const second = renderHook(() => useEvents());
    let resolveRpc!: (value: unknown) => void;
    let resolveSelect!: (value: unknown) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve=>{resolveRpc=resolve;}));
    mocks.eventsSelect.mockReturnValueOnce(new Promise(resolve=>{resolveSelect=resolve;}));
    let stale!: Promise<void>;
    act(()=>{stale=first.result.current.refetch();});
    const oldRows=mocks.rows;
    mocks.rows=[...oldRows,{id:'new-event',user_id:'owner-a',name:'New'}];
    mocks.rpc.mockResolvedValue({data:mocks.rows,error:null});
    mocks.eventsSelect.mockResolvedValue({data:mocks.rows,error:null});
    act(()=>notifyEventCreated('owner-a','new-event'));
    expect(first.result.current.loaded).toBe(false);
    await act(async()=>{resolveRpc({data:oldRows,error:null});resolveSelect({data:oldRows,error:null});await stale;});
    await waitFor(()=>expect(first.result.current.events.map(row=>row.id)).toEqual(['event-a','new-event']));
    await waitFor(()=>expect(second.result.current.events.map(row=>row.id)).toEqual(['event-a','new-event']));
    const third=renderHook(()=>useEvents());
    expect(third.result.current.events.map(row=>row.id)).toEqual(['event-a','new-event']);
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });
  beforeEach(() => {
    clearAllCaches();
    setCacheUserId(null);
    mocks.userId = 'owner-a';
    mocks.rows = [{ id: 'event-a', user_id: 'owner-a', name: 'A' }];
    mocks.authCallback = undefined;
    mocks.rpc.mockReset().mockResolvedValue({ data: mocks.rows, error: null });
    mocks.eventsSelect.mockReset().mockResolvedValue({ data: mocks.rows, error: null });
  });

  afterEach(() => clearAllCaches());

  it('reuses the authenticated user cache without a second visible load or duplicate requests', async () => {
    const first = renderHook(() => useEvents());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.eventsSelect).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useEvents());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.events.map((event) => event.id)).toEqual(['event-a']);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.eventsSelect).toHaveBeenCalledTimes(1);
  });

  it('clears the previous account collection before another account can mount', async () => {
    const first = renderHook(() => useEvents());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));

    mocks.userId = 'owner-b';
    mocks.rows = [{ id: 'event-b', user_id: 'owner-b', name: 'B' }];
    mocks.rpc.mockResolvedValue({ data: mocks.rows, error: null });
    mocks.eventsSelect.mockResolvedValue({ data: mocks.rows, error: null });
    clearAllCaches();
    setCacheUserId('owner-b');

    const second = renderHook(() => useEvents());
    expect(second.result.current.events).toEqual([]);
    await waitFor(() => expect(second.result.current.events.map((event) => event.id)).toEqual(['event-b']));
    expect(second.result.current.events.map((event) => event.id)).not.toContain('event-a');
  });

  it('keeps populated events visible while a background refetch is in progress', async () => {
    const hook = renderHook(() => useEvents());
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));

    let resolveRpc: ((value: unknown) => void) | undefined;
    let resolveSelect: ((value: unknown) => void) | undefined;
    mocks.rpc.mockReturnValueOnce(new Promise((resolve) => { resolveRpc = resolve; }));
    mocks.eventsSelect.mockReturnValueOnce(new Promise((resolve) => { resolveSelect = resolve; }));

    let refresh: Promise<void> | undefined;
    act(() => { refresh = hook.result.current.refetch(); });
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.events.map((event) => event.id)).toEqual(['event-a']);

    await act(async () => {
      resolveRpc?.({ data: mocks.rows, error: null });
      resolveSelect?.({ data: mocks.rows, error: null });
      await refresh;
    });
    expect(hook.result.current.events.map((event) => event.id)).toEqual(['event-a']);
  });

  it('clears cached events on sign-out before another account can load', async () => {
    const first = renderHook(() => useEvents());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));

    act(() => mocks.authCallback?.('SIGNED_OUT', null));
    expect(first.result.current.events).toEqual([]);

    mocks.userId = 'owner-b';
    mocks.rows = [{ id: 'event-b', user_id: 'owner-b', name: 'B' }];
    mocks.rpc.mockResolvedValue({ data: mocks.rows, error: null });
    mocks.eventsSelect.mockResolvedValue({ data: mocks.rows, error: null });
    const second = renderHook(() => useEvents());
    expect(second.result.current.events).toEqual([]);
    await waitFor(() => expect(second.result.current.events.map((event) => event.id)).toEqual(['event-b']));
  });

 it('reloads saved event caps after confirmed entitlement changes',async()=>{
  const view=renderHook(()=>useEvents());await waitFor(()=>expect(view.result.current.loaded).toBe(true));mocks.rows=[{id:'event-a',user_id:'owner-a',name:'A',guest_limit:100} as any];mocks.rpc.mockResolvedValue({data:mocks.rows,error:null});mocks.eventsSelect.mockResolvedValue({data:mocks.rows,error:null});
  act(()=>window.dispatchEvent(new Event('ww:plan-entitlement-changed')));await waitFor(()=>expect(view.result.current.events[0].guest_limit).toBe(100));
 });
});
