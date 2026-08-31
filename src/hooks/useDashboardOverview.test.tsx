import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown[]; error: null };
type Deferred = { promise: Promise<QueryResult>; resolve: (value: QueryResult) => void };

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  pending: new Map<string, Deferred>(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

import {
  calculateDashboardOverview,
  DASHBOARD_OVERVIEW_REQUEST_COUNT,
  resetDashboardOverviewCacheForTests,
  useDashboardOverview,
} from './useDashboardOverview';

const makeDeferred = (): Deferred => {
  let resolve!: Deferred['resolve'];
  const promise = new Promise<QueryResult>((done) => { resolve = done; });
  return { promise, resolve };
};

const resolveEvent = (eventId: string, guestId: string | null) => {
  mocks.pending.get(`guests:${eventId}`)?.resolve({
    data: guestId ? [{ id: guestId, event_id: eventId, rsvp: 'Attending', table_id: null, dietary: '' }] : [],
    error: null,
  });
  mocks.pending.get(`tables:${eventId}`)?.resolve({ data: [], error: null });
  mocks.pending.get(`dynamic_qr_codes:${eventId}`)?.resolve({ data: [], error: null });
};

describe('Dashboard overview calculations', () => {
  it('uses guest rows, confirmed seating, saved capacities, dietary values and active QR data', () => {
    const result = calculateDashboardOverview(
      [
        { id: '1', event_id: 'event-1', rsvp: 'Attending', table_id: 'table-1', dietary: 'Gluten free' },
        { id: '2', event_id: 'event-1', rsvp: 'confirmed', table_id: null, dietary: 'none' },
        { id: '3', event_id: 'event-1', rsvp: 'Pending', table_id: 'table-1', dietary: 'NA' },
        { id: '4', event_id: 'event-1', rsvp: 'Not Attending', table_id: null, dietary: 'Vegan' },
      ],
      [{ id: 'table-1', event_id: 'event-1', limit_seats: 1 }],
      [{ code: 'ABC123', current_event_id: 'event-1', is_active: true }],
    );

    expect(result).toEqual({
      totalGuests: 4,
      attendingGuests: 2,
      pendingGuests: 1,
      declinedGuests: 1,
      tableCount: 1,
      seatedAttendingGuests: 1,
      unseatedAttendingGuests: 1,
      dietaryGuests: 2,
      overCapacityTables: 1,
      qrReady: true,
    });
    expect(DASHBOARD_OVERVIEW_REQUEST_COUNT).toBe(3);
  });

  it('handles an event with no guest, table or QR data', () => {
    expect(calculateDashboardOverview([], [], [])).toEqual({
      totalGuests: 0,
      attendingGuests: 0,
      pendingGuests: 0,
      declinedGuests: 0,
      tableCount: 0,
      seatedAttendingGuests: 0,
      unseatedAttendingGuests: 0,
      dietaryGuests: 0,
      overCapacityTables: 0,
      qrReady: false,
    });
  });
});

describe('useDashboardOverview event isolation', () => {
  beforeEach(() => {
    resetDashboardOverviewCacheForTests();
    mocks.pending.clear();
    mocks.from.mockReset();
    mocks.from.mockImplementation((table: string) => {
      let eventId = '';
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          if (column === 'event_id' || column === 'current_event_id') eventId = String(value);
          return builder;
        }),
        limit: vi.fn(() => builder),
        then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) => {
          const key = `${table}:${eventId}`;
          if (!mocks.pending.has(key)) mocks.pending.set(key, makeDeferred());
          return mocks.pending.get(key)!.promise.then(resolve, reject);
        },
      };
      return builder;
    });
  });

  it('does not publish a slower response from the previously selected event', async () => {
    const { result, rerender } = renderHook(({ eventId }) => useDashboardOverview(eventId), {
      initialProps: { eventId: 'event-a' as string | null },
    });

    await waitFor(() => expect(mocks.pending.size).toBe(3));
    rerender({ eventId: 'event-b' });
    await waitFor(() => expect(mocks.pending.size).toBe(6));
    expect(mocks.from).toHaveBeenCalledTimes(6);

    await act(async () => { resolveEvent('event-b', 'guest-b'); });
    await waitFor(() => expect(result.current.data?.totalGuests).toBe(1));
    expect(result.current.data?.attendingGuests).toBe(1);

    await act(async () => { resolveEvent('event-a', null); });
    expect(result.current.data?.totalGuests).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('renders core guest and table data without waiting for the secondary QR request', async () => {
    const { result } = renderHook(() => useDashboardOverview('event-core'));
    await waitFor(() => expect(mocks.pending.size).toBe(3));

    await act(async () => {
      mocks.pending.get('guests:event-core')?.resolve({
        data: [{ id: 'guest-1', event_id: 'event-core', rsvp: 'Attending', table_id: null, dietary: '' }],
        error: null,
      });
      mocks.pending.get('tables:event-core')?.resolve({ data: [], error: null });
    });

    await waitFor(() => expect(result.current.data?.totalGuests).toBe(1));
    expect(result.current.loading).toBe(false);
    expect(result.current.secondaryLoading).toBe(true);
    expect(result.current.data?.qrReady).toBeNull();

    await act(async () => {
      mocks.pending.get('dynamic_qr_codes:event-core')?.resolve({
        data: [{ code: 'READY', current_event_id: 'event-core', is_active: true }],
        error: null,
      });
    });
    await waitFor(() => expect(result.current.secondaryLoading).toBe(false));
    expect(result.current.data?.qrReady).toBe(true);
  });

  it('reuses a fresh event overview without issuing another request waterfall', async () => {
    const first = renderHook(() => useDashboardOverview('event-cached'));
    await waitFor(() => expect(mocks.pending.size).toBe(3));
    await act(async () => { resolveEvent('event-cached', 'guest-cached'); });
    await waitFor(() => expect(first.result.current.secondaryLoading).toBe(false));
    expect(first.result.current.data?.totalGuests).toBe(1);
    first.unmount();

    const requestCount = mocks.from.mock.calls.length;
    const second = renderHook(() => useDashboardOverview('event-cached'));
    expect(second.result.current.data?.totalGuests).toBe(1);
    expect(second.result.current.loading).toBe(false);
    expect(mocks.from).toHaveBeenCalledTimes(requestCount);
  });
});
