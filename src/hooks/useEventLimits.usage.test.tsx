import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  allowance: {
    planKey: 'free' as const,
    includedEvents: 1,
    paidAdditionalEvents: 0,
    totalAllowed: 1,
    activeEvents: 0,
    remaining: 1,
    atCap: false,
    canPurchaseAdditionalEvents: false,
    canCreate: true,
  },
  allowanceError: null as Error | null,
  filters: [] as Array<[string, string, string]>,
}));

vi.mock('@/lib/eventAllowance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/eventAllowance')>();
  return {
    ...actual,
    getEventAllowanceSnapshot: vi.fn(async () => {
      if (mocks.allowanceError) throw mocks.allowanceError;
      return mocks.allowance;
    }),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'member-uuid' } } })) },
    from: vi.fn((table: string) => {
      if (table === 'account_members') {
        const query: any = {};
        query.select = vi.fn(() => query);
        query.eq = vi.fn(() => query);
        query.is = vi.fn(() => query);
        query.order = vi.fn(() => query);
        query.limit = vi.fn(() => query);
        query.maybeSingle = vi.fn(async () => ({ data: { account_owner_id: 'master-uuid' }, error: null }));
        return query;
      }
      if (table === 'events') {
        return { select: vi.fn(() => ({ eq: vi.fn(async (_column: string, owner: string) => {
          mocks.filters.push(['events', 'user_id', owner]);
          return { data: [{ id: 'event-1' }], error: null };
        }) })) };
      }
      return { select: vi.fn(() => ({ in: vi.fn(async () => ({ count: 78, error: null })) })) };
    }),
  },
}));

import { useEventLimits } from './useEventLimits';

describe('authoritative account event usage', () => {
  beforeEach(() => {
    mocks.allowanceError = null;
    mocks.filters = [];
    Object.assign(mocks.allowance, {
      planKey: 'free', includedEvents: 1, paidAdditionalEvents: 0,
      totalAllowed: 1, activeEvents: 0, remaining: 1, atCap: false,
      canPurchaseAdditionalEvents: false, canCreate: true,
    });
  });

  it('uses the database allowance and master account guest scope', async () => {
    const { result } = renderHook(() => useEventLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentEvents).toBe(0);
    expect(result.current.totalAllowed).toBe(1);
    expect(result.current.totalGuests).toBe(78);
    expect(result.current.canPurchaseAdditionalEvents).toBe(false);
    expect(mocks.filters).toContainEqual(['events', 'user_id', 'master-uuid']);
  });

  it('fails closed when the authoritative allowance cannot be loaded', async () => {
    mocks.allowanceError = new Error('offline');
    const { result } = renderHook(() => useEventLimits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.atCap).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.eventsError).toBe('Unable to load event usage.');
    expect(result.current.additionalEventsError).toBe('Unable to load additional event purchases.');
  });
});
