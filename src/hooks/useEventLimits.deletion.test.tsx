import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eventCounts: [3, 2] as number[],
  eventCountRequests: 0,
}));

vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => ({ plan: { plan_name: 'Free' }, loading: false }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-uuid' } } }) },
    from: vi.fn((table: string) => {
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => {
              const index = Math.min(mocks.eventCountRequests, mocks.eventCounts.length - 1);
              mocks.eventCountRequests += 1;
              return { count: mocks.eventCounts[index] };
            }),
          })),
        };
      }
      const purchaseQuery: Record<string, ReturnType<typeof vi.fn>> = {};
      purchaseQuery.select = vi.fn(() => purchaseQuery);
      purchaseQuery.eq = vi.fn((column: string) => column === 'status' ? Promise.resolve({ count: 0 }) : purchaseQuery);
      return purchaseQuery;
    }),
  },
}));

import { EVENT_DELETED_EVENT } from '@/lib/eventDeletion';
import { useEventLimits } from './useEventLimits';

describe('event usage invalidation after deletion', () => {
  beforeEach(() => {
    mocks.eventCountRequests = 0;
    mocks.eventCounts = [3, 2];
  });

  it('updates 3 of 3 to 2 of 3 and revalidates the database count', async () => {
    const { result } = renderHook(() => useEventLimits());
    await waitFor(() => expect(result.current.currentEvents).toBe(3));

    act(() => {
      window.dispatchEvent(new CustomEvent(EVENT_DELETED_EVENT, {
        detail: { eventId: 'event-uuid', ownerId: 'owner-uuid' },
      }));
    });

    expect(result.current.currentEvents).toBe(2);
    await waitFor(() => expect(mocks.eventCountRequests).toBe(2));
    expect(result.current.totalAllowed).toBe(3);
  });
});
