import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), insert: vi.fn(), rpc: vi.fn(), auth: vi.fn(), filters: [] as unknown[][] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => {
    let event = '';
    const query: any = {
      select: () => query,
      eq: (key: string, value: string) => { mocks.filters.push([key, value]); if (key === 'current_event_id') event = value; return query; },
      order: () => query, limit: () => query,
      maybeSingle: () => mocks.read(event), insert: mocks.insert,
    };
    return query;
  },
  rpc: mocks.rpc, auth: { getUser: mocks.auth },
} }));
vi.mock('@/lib/urlUtils', () => ({ buildDynamicQRUrl: (code: string) => `https://example.test/qr/${code}` }));
import { useEventDynamicQR } from './useEventDynamicQR';
function deferred() { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; }
beforeEach(() => {
  vi.clearAllMocks(); mocks.filters = [];
  mocks.read.mockImplementation(async (event: string) => ({ data: { code: event }, error: null }));
  mocks.auth.mockResolvedValue({ data: { user: { id: 'owner' } } });
  mocks.rpc.mockResolvedValue({ data: 'new-code', error: null });
  mocks.insert.mockResolvedValue({ error: null });
});
afterEach(cleanup);
describe('event QR resolution', () => {
  it('uses an active guest lookup QR, excluding kiosk destinations', async () => {
    const hook = renderHook(() => useEventDynamicQR('event-a'));
    await waitFor(() => expect(hook.result.current.code).toBe('event-a'));
    expect(mocks.filters).toContainEqual(['destination_type', 'guest_lookup']);
    expect(mocks.filters).toContainEqual(['is_active', true]);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('never exposes the previous event link while another event loads or fails', async () => {
    const next = deferred();
    const hook = renderHook(({ id }) => useEventDynamicQR(id), { initialProps: { id: 'event-a' } });
    await waitFor(() => expect(hook.result.current.code).toBe('event-a'));
    mocks.read.mockReturnValue(next.promise);
    hook.rerender({ id: 'event-b' });
    expect(hook.result.current.dynamicUrl).toBeNull();
    await act(async () => next.resolve({ error: new Error('Denied'), data: null }));
    expect(hook.result.current.dynamicUrl).toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('ignores a slow response for an event that is no longer selected', async () => {
    const first = deferred(); mocks.read.mockReturnValueOnce(first.promise);
    const hook = renderHook(({ id }) => useEventDynamicQR(id), { initialProps: { id: 'event-a' } });
    hook.rerender({ id: 'event-b' });
    await waitFor(() => expect(hook.result.current.code).toBe('event-b'));
    await act(async () => first.resolve({ data: { code: 'event-a' }, error: null }));
    expect(hook.result.current.code).toBe('event-b');
  });
  it('does not create a new QR when the existing-code lookup failed', async () => {
    mocks.read.mockResolvedValue({ data: null, error: new Error('Unavailable') });
    const hook = renderHook(() => useEventDynamicQR('event-a'));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('publishes a newly generated link only after its database insert succeeds', async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    const insert = deferred(); mocks.insert.mockReturnValue(insert.promise);
    const hook = renderHook(() => useEventDynamicQR('event-a'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(hook.result.current.dynamicUrl).toBeNull();
    await act(async () => insert.resolve({ error: null }));
    expect(hook.result.current.dynamicUrl).toBe('https://example.test/qr/new-code');
  });
  it('does not publish a generated code if the insert fails', async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ error: new Error('Insert denied') });
    const hook = renderHook(() => useEventDynamicQR('event-a'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.dynamicUrl).toBeNull();
  });
});
