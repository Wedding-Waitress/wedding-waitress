import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  rpc: vi.fn(),
  updatePayload: null as Record<string, unknown> | null,
  updateResult: { data: { id: 'event-1' }, error: null } as { data: { id: string } | null; error: unknown },
  validation: {
    maximumGuestLimit: 100,
    existingGuestCount: 0,
    tableSeatCapacity: 92,
    minimumGuestLimit: 92,
    isPlatformOwner: false,
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: null, updateDisplayCountdownEvent: vi.fn() }) }));
vi.mock('@/lib/eventDeletionWithImage', () => ({ deleteOwnedEventWithImage: vi.fn() }));
vi.mock('@/lib/eventHeroImage', () => ({ syncEventHeroImage: vi.fn() }));
vi.mock('@/lib/guestCapacityAccess', async () => {
  const actual = await vi.importActual<typeof import('@/lib/guestCapacityAccess')>('@/lib/guestCapacityAccess');
  return {
    ...actual,
    getEventGuestLimitValidation: vi.fn(async () => mocks.validation),
  };
});

vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  const updateBuilder = {
    eq: vi.fn(() => updateBuilder),
    select: vi.fn(() => updateBuilder),
    maybeSingle: vi.fn(async () => mocks.updateResult),
  };
  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'owner-1' } } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      rpc: mocks.rpc,
      from: vi.fn((table: string) => {
        if (table !== 'events') throw new Error(`Unexpected table: ${table}`);
        return {
          select: vi.fn(async () => ({
            data: [{ id: 'event-1', user_id: 'owner-1', ceremony_guest_limit: null }],
            error: null,
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            mocks.updatePayload = payload;
            return updateBuilder;
          }),
        };
      }),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

import { clearAllCaches, setCacheUserId } from '@/lib/cacheRegistry';
import { useEvents } from './useEvents';

const eventRow = {
  id: 'event-1',
  user_id: 'owner-1',
  name: 'Hossam & Reema’s Wedding',
  guest_limit: 110,
  guests_count: 0,
  ceremony_guest_limit: null,
};

describe('useEvents event updates', () => {
  beforeEach(() => {
    clearAllCaches();
    setCacheUserId('owner-1');
    mocks.toast.mockReset();
    mocks.updatePayload = null;
    mocks.updateResult = { data: { id: 'event-1' }, error: null };
    mocks.validation = {
      maximumGuestLimit: 100,
      existingGuestCount: 0,
      tableSeatCapacity: 92,
      minimumGuestLimit: 92,
      isPlatformOwner: false,
    };
    mocks.rpc.mockReset().mockResolvedValue({ data: [eventRow], error: null });
  });

  afterEach(() => clearAllCaches());

  it('saves 110 to 100, updates local state after confirmation, and avoids a duplicate full refetch', async () => {
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.events[0]?.guest_limit).toBe(110));

    await act(async () => { await result.current.updateEvent('event-1', { guest_limit: 100 }); });

    expect(mocks.updatePayload).toEqual({ guest_limit: 100 });
    expect(result.current.events[0]?.guest_limit).toBe(100);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Success', description: 'Event updated successfully' });
  });

  it('blocks a limit below 92 with the exact reason and never sends the update', async () => {
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.events[0]?.guest_limit).toBe(110));

    await act(async () => {
      await expect(result.current.updateEvent('event-1', { guest_limit: 91 })).rejects.toThrow(
        'The guest limit must be at least 92.',
      );
    });

    expect(mocks.updatePayload).toBeNull();
    expect(result.current.events[0]?.guest_limit).toBe(110);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Guest limit not updated',
      description: 'This event currently has 0 guests and 92 table seats. The guest limit must be at least 92.',
      variant: 'destructive',
    }));
  });

  it('never reports success when Supabase confirms that no row was updated', async () => {
    mocks.updateResult = { data: null, error: null };
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.events[0]?.guest_limit).toBe(110));

    await act(async () => {
      await expect(result.current.updateEvent('event-1', { guest_limit: 100 })).rejects.toThrow(
        'The event was not found or you do not have permission to update it.',
      );
    });

    expect(result.current.events[0]?.guest_limit).toBe(110);
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
  });
});
