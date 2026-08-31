import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  toast: vi.fn(),
  updateDisplayCountdownEvent: vi.fn().mockResolvedValue(undefined),
  deleteOwnedEventRow: vi.fn(),
  membershipQuery: {} as Record<string, ReturnType<typeof vi.fn>>,
}));
mocks.membershipQuery.select = vi.fn(() => mocks.membershipQuery);
mocks.membershipQuery.eq = vi.fn(() => mocks.membershipQuery);
mocks.membershipQuery.order = vi.fn(() => mocks.membershipQuery);
mocks.membershipQuery.limit = vi.fn(() => mocks.membershipQuery);
mocks.membershipQuery.maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'master' } });

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { id: 'owner-uuid', display_countdown_event_id: 'victim-uuid' },
    updateDisplayCountdownEvent: mocks.updateDisplayCountdownEvent,
  }),
}));
vi.mock('@/lib/eventDeletion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/eventDeletion')>('@/lib/eventDeletion');
  return { ...actual, deleteOwnedEventRow: mocks.deleteOwnedEventRow };
});
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-uuid' } } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      rpc: vi.fn().mockImplementation(async () => ({ data: mocks.rows.map((row) => ({ ...row })), error: null })),
      from: vi.fn((table: string) => {
        if (table === 'account_members') return mocks.membershipQuery;
        if (table === 'events') {
          return { select: vi.fn(async () => ({ data: mocks.rows.map(({ id }) => ({ id })), error: null })) };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

import { clearAllCaches } from '@/lib/cacheRegistry';
import { EventDeletionError } from '@/lib/eventDeletion';
import { getSelectedEventId, setSelectedEventId } from '@/hooks/useSelectedEvent';
import { useEvents } from './useEvents';

const event = (id: string, name: string) => ({
  id,
  user_id: 'owner-uuid',
  name,
  date: '2027-03-20',
  venue: null,
  start_time: null,
  finish_time: null,
  guest_limit: 100,
  created_at: '2026-08-16T00:00:00Z',
  guests_count: 0,
  event_created: '2026-08-16',
  expiry_date: '2027-08-16',
  created_date_local: '2026-08-16',
  expiry_date_local: '2027-08-16',
  event_timezone: 'Australia/Sydney',
  partner1_name: null,
  partner2_name: null,
  slug: null,
  rsvp_deadline: null,
  relation_allow_single_partner: null,
});

describe('useEvents confirmed deletion state', () => {
  beforeEach(() => {
    mocks.rows = [event('victim-uuid', 'Jack & Jill'), event('remaining-uuid', 'Andy & Cathy')];
    mocks.toast.mockClear();
    mocks.updateDisplayCountdownEvent.mockClear();
    mocks.deleteOwnedEventRow.mockReset();
    mocks.membershipQuery.maybeSingle.mockResolvedValue({ data: { role: 'master' } });
    setSelectedEventId('victim-uuid');
  });

  afterEach(() => {
    clearAllCaches();
    setSelectedEventId(null);
  });

  it('publishes success only after the returned database row is confirmed', async () => {
    // Legacy/free owners can have no account_members row even though
    // events.user_id is their authenticated UUID.
    mocks.membershipQuery.maybeSingle.mockResolvedValueOnce({ data: null });
    mocks.deleteOwnedEventRow.mockImplementation(async (id: string, ownerId: string) => {
      mocks.rows = mocks.rows.filter((row) => row.id !== id);
      return { id, user_id: ownerId };
    });
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.events).toHaveLength(2));
    await waitFor(() => expect(result.current.activeEventId).toBe('victim-uuid'));

    await act(async () => { await result.current.deleteEvent('victim-uuid'); });

    expect(result.current.events.map((item) => item.id)).toEqual(['remaining-uuid']);
    expect(mocks.rows.map((item) => item.id)).toEqual(['remaining-uuid']);
    expect(result.current.activeEventId).toBe('remaining-uuid');
    expect(getSelectedEventId()).toBe('remaining-uuid');
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Success', description: 'Event deleted successfully' });
  });

  it('keeps state intact and never reports success when the database confirms zero rows', async () => {
    mocks.deleteOwnedEventRow.mockRejectedValue(new EventDeletionError('not-deleted', 'The event was not deleted.'));
    const { result } = renderHook(() => useEvents());
    await waitFor(() => expect(result.current.events).toHaveLength(2));

    await act(async () => {
      await expect(result.current.deleteEvent('victim-uuid')).rejects.toMatchObject({ reason: 'not-deleted' });
    });

    expect(result.current.events.map((item) => item.id)).toEqual(['victim-uuid', 'remaining-uuid']);
    expect(getSelectedEventId()).toBe('victim-uuid');
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error', variant: 'destructive' }));
  });
});
