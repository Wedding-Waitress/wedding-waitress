import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  },
}));

import { getEventGuestLimitValidation } from './guestCapacityAccess';

describe('guest-capacity RPC rollout fallback', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'get_event_guest_capacity') {
        return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Function not found' } });
      }
      if (name === 'has_platform_owner_access') return Promise.resolve({ data: false, error: null });
      if (name === 'get_user_plan') return Promise.resolve({ data: [{ guest_limit: 100 }], error: null });
      throw new Error(`Unexpected RPC: ${name}`);
    });
    mocks.from.mockImplementation((table: string) => {
      if (table === 'guests') {
        return { select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }) };
      }
      if (table === 'tables') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [{ limit_seats: 92 }], error: null }) }) };
      }
      if (table === 'rsvp_invite_purchases') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: [{ overage_blocks: 1 }], error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('falls back to existing plan, purchase and usage sources when the new RPC is absent', async () => {
    await expect(getEventGuestLimitValidation('event-1')).resolves.toEqual({
      maximumGuestLimit: 110,
      existingGuestCount: 0,
      tableSeatCapacity: 92,
      minimumGuestLimit: 92,
      isPlatformOwner: false,
    });
  });
});
