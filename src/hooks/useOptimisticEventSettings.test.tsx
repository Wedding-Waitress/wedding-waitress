import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { useOptimisticEventSettings } from './useOptimisticEventSettings';
import { clearAllCaches } from '@/lib/cacheRegistry';
interface Settings { event_id: string; enabled: boolean; other: boolean }
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(initial = 'a') {
  const rows: Record<string, Settings> = {
    a: { event_id: 'a', enabled: false, other: true },
    b: { event_id: 'b', enabled: true, other: false },
  };
  const loads: Record<string, ReturnType<typeof deferred<Settings>>> = {};
  const writes: { id: string; patch: Partial<Settings>; request: ReturnType<typeof deferred<Settings>> }[] = [];
  const read = vi.fn((id: string) => {
    const request = deferred<Settings>(); loads[id] = request; return request.promise;
  });
  const write = vi.fn((id: string, patch: Partial<Settings>) => {
    const request = deferred<Settings>(); writes.push({ id, patch, request }); return request.promise;
  });
  const onError = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(({ id }) => useOptimisticEventSettings({ namespace: 'test-settings', eventId: id, read, write, onError }), { wrapper, initialProps: { id: initial } });
  const load = async (id: string) => { await act(async () => { loads[id].resolve({ ...rows[id] }); }); await waitFor(() => expect(hook.result.current.settings?.event_id).toBe(id)); };
  const confirm = async (index: number) => {
    const save = writes[index]; rows[save.id] = { ...rows[save.id], ...save.patch };
    await act(async () => { save.request.resolve({ ...rows[save.id] }); });
  };
  return { ...hook, rows, loads, writes, read, write, onError, client, load, confirm };
}
describe('event settings optimistic write ordering', () => {
  it('stops queued writes and stale cache updates when authentication caches are cleared', async () => {
    const test = setup(); await test.load('a');
    act(() => { void test.result.current.update({ enabled: true }); void test.result.current.update({ enabled: false }); });
    act(() => { clearAllCaches(); test.client.clear(); });
    await test.confirm(0);
    expect(test.writes).toHaveLength(1);
    expect(test.client.getQueryData(['test-settings', 'a'])).toBeUndefined();
  });
  it('keeps settings unknown while loading, then displays the saved ON/OFF mixture', async () => {
    const test = setup();
    expect(test.result.current.settings).toBeUndefined();
    expect(test.result.current.isLoading).toBe(true);
    await test.load('a');
    expect(test.result.current.settings).toMatchObject({ enabled: false, other: true });
  });
  it('responds immediately, saves in order, and does not refetch after successful saves', async () => {
    const test = setup(); await test.load('a');
    act(() => { void test.result.current.update({ enabled: true }); });
    expect(test.result.current.settings?.enabled).toBe(true);
    expect(test.writes).toHaveLength(1);
    act(() => { void test.result.current.update({ enabled: false }); });
    expect(test.result.current.settings?.enabled).toBe(false);
    expect(test.writes).toHaveLength(1);
    await test.confirm(0);
    expect(test.result.current.settings?.enabled).toBe(false);
    expect(test.writes).toHaveLength(2);
    await test.confirm(1);
    expect(test.rows.a.enabled).toBe(false);
    expect(test.read).toHaveBeenCalledTimes(1);
    expect(test.result.current.isSaving).toBe(false);
    act(() => { void test.result.current.refresh(); });
    await test.load('a');
    expect(test.result.current.settings?.enabled).toBe(false);
  });
  it('restores the last confirmed values after a failed save and reports an error', async () => {
    const test = setup(); await test.load('a');
    act(() => { void test.result.current.update({ enabled: true }); });
    await act(async () => { test.writes[0].request.reject(new Error('Network unavailable')); });
    expect(test.result.current.settings?.enabled).toBe(false);
    expect(test.result.current.settings?.other).toBe(true);
    expect(test.onError).toHaveBeenCalledOnce();
  });
  it('retains newer pending clicks when an older save fails', async () => {
    const test = setup(); await test.load('a');
    act(() => { void test.result.current.update({ enabled: true }); void test.result.current.update({ other: false }); });
    await act(async () => { test.writes[0].request.reject(new Error('Denied')); });
    expect(test.result.current.settings).toMatchObject({ enabled: false, other: false });
    await test.confirm(1);
    expect(test.rows.a).toMatchObject({ enabled: false, other: false });
  });
  it('isolates loads, saves, and failures when switching events', async () => {
    const test = setup(); await test.load('a');
    act(() => { void test.result.current.update({ enabled: true }); });
    test.rerender({ id: 'b' });
    expect(test.result.current.settings).toBeUndefined();
    await test.load('b');
    act(() => { void test.result.current.update({ enabled: false }); });
    await act(async () => { test.writes[0].request.reject(new Error('Old event failed')); });
    expect(test.result.current.settings).toMatchObject({ event_id: 'b', enabled: false });
    expect(test.onError).not.toHaveBeenCalled();
    await test.confirm(1);
    expect(test.rows.b.enabled).toBe(false);
    test.rerender({ id: 'a' });
    expect(test.result.current.settings).toMatchObject({ event_id: 'a', enabled: false });
  });
  it('ignores a pre-click refetch response that arrives after the save', async () => {
    const test = setup(); await test.load('a');
    act(() => { void test.result.current.refresh(); });
    const staleRead = test.loads.a;
    act(() => { void test.result.current.update({ enabled: true }); });
    await test.confirm(0);
    await act(async () => { staleRead.resolve({ event_id: 'a', enabled: false, other: true }); });
    expect(test.result.current.settings?.enabled).toBe(true);
  });
  it('does not leak an old event load into the newly selected event', async () => {
    const test = setup(); test.rerender({ id: 'b' });
    await act(async () => { test.loads.a.resolve(test.rows.a); });
    expect(test.result.current.settings).toBeUndefined();
    await test.load('b');
    expect(test.result.current.settings).toMatchObject({ event_id: 'b', enabled: true });
  });
});
