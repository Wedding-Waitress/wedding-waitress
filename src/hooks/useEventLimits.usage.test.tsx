import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ownerId: 'master-uuid',
  filters: [] as Array<[string, string, string]>,
  eventResult: { data: [{ id: 'event-1' }, { id: 'event-2' }, { id: 'event-3' }], count: 3, error: null as { message: string } | null },
  additionalResult: { count: 1, error: null as { message: string } | null },
  guestResult: { count: 78, error: null as { message: string } | null },
}));

vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => ({ plan: { plan_name: 'Free' }, loading: false }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'member-uuid' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'account_members') {
        const query: Record<string, ReturnType<typeof vi.fn>> = {};
        query.select = vi.fn(() => query);
        query.eq = vi.fn(() => query);
        query.is = vi.fn(() => query);
        query.order = vi.fn(() => query);
        query.limit = vi.fn(() => query);
        query.maybeSingle = vi.fn(async () => ({
          data: { account_owner_id: mocks.ownerId },
          error: null,
        }));
        return query;
      }

      const result = table === 'events'
        ? mocks.eventResult
        : table === 'guests'
          ? mocks.guestResult
          : mocks.additionalResult;
      const query: Record<string, ReturnType<typeof vi.fn>> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn((column: string, value: string) => {
        mocks.filters.push([table, column, value]);
        if (table === 'events') return Promise.resolve(result);
        if (table === 'additional_event_purchases' && column !== 'status') return query;
        return Promise.resolve(result);
      });
      query.in = vi.fn((column: string) => {
        mocks.filters.push([table, column, 'owned-event-ids']);
        return Promise.resolve(result);
      });
      return query;
    }),
  },
}));

import { useEventLimits } from './useEventLimits';

describe('account usage totals', () => {
  beforeEach(() => {
    mocks.filters = [];
    mocks.eventResult = { data: [{ id: 'event-1' }, { id: 'event-2' }, { id: 'event-3' }], count: 3, error: null };
    mocks.additionalResult = { count: 1, error: null };
    mocks.guestResult = { count: 78, error: null };
  });

  it('counts the master account usage for a team member', async () => {
    const { result } = renderHook(() => useEventLimits());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentEvents).toBe(3);
    expect(result.current.additionalPurchased).toBe(1);
    expect(result.current.totalGuests).toBe(78);
    expect(result.current.remaining).toBe(1);
    expect(mocks.filters).toEqual(expect.arrayContaining([
      ['events', 'user_id', 'master-uuid'],
      ['additional_event_purchases', 'user_id', 'master-uuid'],
      ['guests', 'event_id', 'owned-event-ids'],
    ]));
  });

  it('exposes failed usage queries instead of treating them as verified zeroes', async () => {
    mocks.eventResult = { data: [], count: null as unknown as number, error: { message: 'network unavailable' } };
    mocks.guestResult = { count: null as unknown as number, error: { message: 'permission denied' } };

    const { result } = renderHook(() => useEventLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.eventsError).toBe('Unable to load event usage.');
    expect(result.current.guestsError).toBe('Unable to load guest usage.');
    expect(result.current.additionalEventsError).toBeNull();
  });

  it('fails closed at the included-event cap when paid add-ons cannot be verified', async () => {
    mocks.additionalResult = { count: null as unknown as number, error: { message: 'network unavailable' } };

    const { result } = renderHook(() => useEventLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.additionalEventsError).toBe('Unable to load additional event purchases.');
    expect(result.current.currentEvents).toBe(3);
    expect(result.current.atCap).toBe(true);
  });
});
