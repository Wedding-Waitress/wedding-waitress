import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIndividualTableChartSettings } from './useIndividualTableChartSettings';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const event = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const settings = {
  tableShape: 'round' as const, fontSize: 'medium' as const, guestTextSize: 'standard' as const,
  includeNames: true, includeDietary: true, includeRelation: true, includeGuestList: true,
  showSeatNumbers: true, isBold: false, isItalic: false, isUnderline: false, largerTableNames: false,
  showLogo: true, enableEndSeats: false, endSeatsCount: 1 as const, paperSize: 'A4' as const,
  guestNameColor: '#000000' as const, seatNumberColor: '#000000' as const, guestListColor: '#000000' as const,
  dietaryColor: '#000000' as const, relationshipColor: '#000000' as const,
};
const row = { user_id: owner, event_id: event, revision: 1, settings };
beforeEach(() => rpc.mockReset());

describe('explicit scoped chart synchronization', () => {
  it('does nothing before matching backend integration is enabled', () => {
    renderHook(() => useIndividualTableChartSettings(owner, owner, event, false));
    expect(rpc).not.toHaveBeenCalled();
  });
  it('reports absent history without creating a default snapshot or reading legacy browser storage', async () => {
    sessionStorage.setItem('ww:individual_table_chart_settings', JSON.stringify({ secret: 'unscoped' }));
    rpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useIndividualTableChartSettings(owner, owner, event, true));
    await waitFor(() => expect(result.current.verified).toBe(true));
    expect(result.current.snapshot).toBeNull();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_individual_table_chart_settings', { p_event_id: event });
    sessionStorage.removeItem('ww:individual_table_chart_settings');
  });
  it('rejects another owner’s response without altering the visible chart', async () => {
    rpc.mockResolvedValue({ data: { ...row, user_id: event }, error: null });
    const { result } = renderHook(() => useIndividualTableChartSettings(owner, owner, event, true));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.verified).toBe(false);
    expect(result.current.snapshot).toBeNull();
  });
  it('saves only on explicit action and strips generated title/pagination', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: row, error: null });
    const { result } = renderHook(() => useIndividualTableChartSettings(owner, owner, event, true));
    await waitFor(() => expect(result.current.verified).toBe(true));
    expect(rpc).toHaveBeenCalledTimes(1);
    await act(async () => { expect(await result.current.save({ ...settings, title: 'TABLE 2', totalTables: 4 })).toBe(true); });
    expect(rpc.mock.calls[1][1]).toEqual({ p_event_id: event, p_settings: settings, p_expected_revision: 0, p_request_id: expect.any(String) });
    expect(result.current.snapshot).toEqual(row);
  });
  it('retains the exact request identity after an unknown save outcome', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null }).mockRejectedValueOnce(new Error('Network disconnected')).mockResolvedValueOnce({ data: row, error: null });
    const { result } = renderHook(() => useIndividualTableChartSettings(owner, owner, event, true));
    await waitFor(() => expect(result.current.verified).toBe(true));
    await act(async () => { expect(await result.current.save({ ...settings, title: '' })).toBe(false); });
    await act(async () => { expect(await result.current.save({ ...settings, title: '' })).toBe(true); });
    expect(rpc.mock.calls[1][1]).toEqual(rpc.mock.calls[2][1]);
  });
  it('hides the old scope immediately and ignores its late server response', async () => {
    let resolve!: (value: unknown) => void;
    rpc.mockReturnValueOnce(new Promise(value => { resolve = value; })).mockResolvedValueOnce({ data: null, error: null });
    const { result, rerender } = renderHook(({ target }) => useIndividualTableChartSettings(owner, owner, target, true), { initialProps: { target: event } });
    rerender({ target: owner });
    await waitFor(() => expect(result.current.verified).toBe(true));
    await act(async () => resolve({ data: row, error: null }));
    expect(result.current.snapshot).toBeNull();
  });
});
