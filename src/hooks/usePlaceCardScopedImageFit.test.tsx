import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc } }));
import { usePlaceCardScopedImageFit } from './usePlaceCardScopedImageFit';
const snapshot = { settings_id: 'settings', image_url: '/actual.png', image_type: 'full_front' as const, x: 23, y: 80, fit: 'cover' as const };
const record = { user_id: 'owner', event_id: 'event', revision: 1, snapshot };
describe('explicit owner/event crop synchronization', () => {
  beforeEach(() => { mock.rpc.mockReset(); });
  it('does not access data without an authenticated actor', () => {
    renderHook(() => usePlaceCardScopedImageFit(null, 'owner', 'event')); expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('does not create or import absent browser history', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null }); const { result } = renderHook(() => usePlaceCardScopedImageFit('actor', 'owner', 'event'));
    await waitFor(() => expect(result.current.verified).toBe(true)); expect(result.current.record).toBeNull(); expect(mock.rpc).toHaveBeenCalledTimes(1);
  });
  it('saves only on explicit action with original expected revision', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: record, error: null });
    const { result } = renderHook(() => usePlaceCardScopedImageFit('actor', 'owner', 'event')); await waitFor(() => expect(result.current.verified).toBe(true));
    await act(async () => { expect(await result.current.save(snapshot)).toBe(true); });
    expect(mock.rpc.mock.calls[1][1]).toEqual({ p_event_id: 'event', p_snapshot: snapshot, p_expected_revision: 0, p_request_id: expect.any(String) }); expect(result.current.record).toEqual(record);
  });
  it('retains the exact request after an unknown save outcome', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: null }).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: record, error: null });
    const { result } = renderHook(() => usePlaceCardScopedImageFit('actor', 'owner', 'event')); await waitFor(() => expect(result.current.verified).toBe(true));
    await act(async () => { expect(await result.current.save(snapshot)).toBe(false); });
    await act(async () => { expect(await result.current.save(snapshot)).toBe(true); }); expect(mock.rpc.mock.calls[1][1]).toEqual(mock.rpc.mock.calls[2][1]);
  });
  it('rejects another account’s returned record', async () => {
    mock.rpc.mockResolvedValue({ data: { ...record, user_id: 'foreign' }, error: null }); const { result } = renderHook(() => usePlaceCardScopedImageFit('actor', 'owner', 'event'));
    await waitFor(() => expect(result.current.error).not.toBeNull()); expect(result.current.verified).toBe(false); expect(result.current.record).toBeNull();
  });
  it('does not expose a previous actor’s cached data after a session change', async () => {
    let resolve!: (value: unknown) => void;
    mock.rpc.mockResolvedValueOnce({ data: record, error: null }).mockImplementation(() => new Promise(value => { resolve = value; }));
    const { result, rerender } = renderHook(({ actor }) => usePlaceCardScopedImageFit(actor, 'owner', 'event'), { initialProps: { actor: 'first' } });
    await waitFor(() => expect(result.current.record).toEqual(record)); rerender({ actor: 'second' }); expect(result.current.record).toBeNull(); expect(result.current.verified).toBe(false);
    await act(async () => resolve({ data: null, error: null }));
  });
});
