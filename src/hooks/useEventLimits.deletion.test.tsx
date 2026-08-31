import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requests: 0 }));

vi.mock('@/lib/eventAllowance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/eventAllowance')>();
  return {
    ...actual,
    getEventAllowanceSnapshot: vi.fn(async () => {
      const active = mocks.requests++ === 0 ? 1 : 0;
      return {
        planKey: 'free', includedEvents: 1, paidAdditionalEvents: 0,
        totalAllowed: 1, activeEvents: active, remaining: 1 - active,
        atCap: active === 1, canPurchaseAdditionalEvents: false, canCreate: true,
      };
    }),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'owner-uuid' } } })) },
    from: vi.fn((table: string) => {
      if (table === 'account_members') {
        const query: any = {};
        query.select = vi.fn(() => query);
        query.eq = vi.fn(() => query);
        query.is = vi.fn(() => query);
        query.order = vi.fn(() => query);
        query.limit = vi.fn(() => query);
        query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
        return query;
      }
      return { select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) })) };
    }),
  },
}));

import { EVENT_DELETED_EVENT } from '@/lib/eventDeletion';
import { useEventLimits } from './useEventLimits';

describe('event allowance invalidation after deletion', () => {
  beforeEach(() => { mocks.requests = 0; });

  it('refreshes 1 of 1 to 0 of 1 after a confirmed deletion', async () => {
    const { result } = renderHook(() => useEventLimits());
    await waitFor(() => expect(result.current.currentEvents).toBe(1));

    act(() => window.dispatchEvent(new CustomEvent(EVENT_DELETED_EVENT)));

    await waitFor(() => expect(result.current.currentEvents).toBe(0));
    expect(result.current.totalAllowed).toBe(1);
    expect(result.current.atCap).toBe(false);
  });
});
