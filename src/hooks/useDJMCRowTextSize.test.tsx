import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc,
  channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn() } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
import { useDJMCRowTextSize } from './useDJMCRowTextSize';
beforeEach(() => { mock.rpc.mockReset(); mock.toast.mockReset(); });
describe('per-event DJMC Row Text Size', () => {
  it('loads saved size and persists an immediate owner change', async () => {
    mock.rpc.mockImplementation(async (name: string) => ({ data: name.startsWith('get_') ? 'larger' : true, error: null }));
    const { result } = renderHook(() => useDJMCRowTextSize('event-1'));
    await waitFor(() => expect(result.current.rowTextSize).toBe('larger'));
    act(() => result.current.setRowTextSize('standard'));
    expect(result.current.rowTextSize).toBe('standard');
    await waitFor(() => expect(mock.rpc).toHaveBeenCalledWith('save_dj_mc_row_text_size', { p_event_id: 'event-1', new_size: 'standard' }));
  });
  it('reads token settings while preventing read-only writes', async () => {
    mock.rpc.mockResolvedValue({ data: 'larger', error: null });
    const { result } = renderHook(() => useDJMCRowTextSize('event-1', 'token', false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setRowTextSize('standard'));
    expect(result.current.rowTextSize).toBe('larger'); expect(mock.rpc).toHaveBeenCalledTimes(1);
  });
  it('serializes rapid saves and restores the last confirmed value after failure', async () => {
    let finish!: (value: unknown) => void;
    mock.rpc.mockImplementation((name: string) => name.startsWith('get_') ? Promise.resolve({ data: 'standard', error: null })
      : new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useDJMCRowTextSize('event-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setRowTextSize('larger'));
    act(() => result.current.setRowTextSize('standard'));
    expect(mock.rpc).toHaveBeenCalledTimes(2);
    await act(async () => finish({ data: true, error: null }));
    expect(mock.rpc).toHaveBeenCalledTimes(3);
    await act(async () => finish({ data: false, error: null }));
    expect(result.current.rowTextSize).toBe('larger'); expect(mock.toast).toHaveBeenCalledOnce();
  });
  it('discards delayed settings for the previous event', async () => {
    let old!: (value: unknown) => void;
    mock.rpc.mockImplementation((_name: string, args: any) => args.p_event_id === 'old'
      ? new Promise(resolve => { old = resolve; }) : Promise.resolve({ data: 'standard', error: null }));
    const { result, rerender } = renderHook(({ event }) => useDJMCRowTextSize(event), { initialProps: { event: 'old' } });
    rerender({ event: 'new' }); await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => old({ data: 'larger', error: null }));
    expect(result.current.rowTextSize).toBe('standard');
  });
});
