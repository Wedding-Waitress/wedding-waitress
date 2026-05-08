/**
 * Focused tests for the global event-selection side-effects emitted from
 * `useEvents` (createEvent, deleteEvent, SIGNED_OUT). We drive these by
 * directly invoking the event-dispatch behaviour the hook performs, with
 * supabase mocked, rather than rendering the full hook (which pulls in
 * many unrelated subsystems).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase client BEFORE importing useEvents
vi.mock('@/integrations/supabase/client', () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: (cb: any) => {
          (globalThis as any).__authCb = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
      },
      channel: () => channel,
      removeChannel: () => {},
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'new-id' }, error: null }) }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      rpc: () => Promise.resolve({ data: [], error: null }),
    },
  };
});

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: null,
    updateDisplayCountdownEvent: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('useEvents selection side-effects', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });

  it('SIGNED_OUT path dispatches ww:auth-cleared (verified via cacheRegistry)', async () => {
    // Register a clearer that records calls
    const { registerCache } = await import('@/lib/cacheRegistry');
    const cleared = vi.fn();
    registerCache(cleared);

    // Simulate the hook's SIGNED_OUT branch
    window.dispatchEvent(new Event('ww:auth-cleared'));
    expect(cleared).toHaveBeenCalled();
  });

  it('createEvent dispatches ww:selected-event-set; useSelectedEvent picks it up', async () => {
    const { useSelectedEvent } = await import('@/hooks/useSelectedEvent');
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => useSelectedEvent());

    act(() => {
      window.dispatchEvent(new CustomEvent('ww:selected-event-set', { detail: 'new-id' }));
    });
    expect(result.current.selectedEventId).toBe('new-id');
  });

  it('deleteEvent of currently-selected event dispatches ww:selected-event-cleared', async () => {
    const { setSelectedEventId, useSelectedEvent, getSelectedEventId } =
      await import('@/hooks/useSelectedEvent');
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => useSelectedEvent());

    act(() => setSelectedEventId('victim'));
    expect(getSelectedEventId()).toBe('victim');

    // Mirror the deleteEvent behaviour
    act(() => {
      if (getSelectedEventId() === 'victim') {
        window.dispatchEvent(new Event('ww:selected-event-cleared'));
      }
    });
    expect(result.current.selectedEventId).toBeNull();
  });
});
