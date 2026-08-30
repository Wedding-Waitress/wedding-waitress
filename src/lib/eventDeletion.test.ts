import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return { rpc: vi.fn() };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));

import { deleteOwnedEventRow, EventDeletionError, getEventDeletionMessage } from './eventDeletion';

describe('verified event deletion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes exactly the internal event UUID owned by the authenticated user', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'event-uuid', user_id: 'owner-uuid' }], error: null });

    await expect(deleteOwnedEventRow('event-uuid', 'owner-uuid')).resolves.toEqual({ id: 'event-uuid', user_id: 'owner-uuid' });
    expect(mocks.rpc).toHaveBeenCalledWith('delete_owned_event_secure', { p_event_id: 'event-uuid' });
  });

  it('treats a zero-row RLS or identifier result as failure', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(deleteOwnedEventRow('event-uuid', 'owner-uuid')).rejects.toMatchObject({ reason: 'not-deleted' });
  });

  it('rejects a returned row whose authoritative owner does not match the authenticated owner', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'event-uuid', user_id: 'other-user' }], error: null });
    await expect(deleteOwnedEventRow('event-uuid', 'owner-uuid')).rejects.toMatchObject({ reason: 'not-deleted' });
  });

  it('preserves database errors and provides an accurate foreign-key message', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '23503', message: 'foreign key violation' } });
    const error = await deleteOwnedEventRow('event-uuid', 'owner-uuid').catch((caught) => caught);
    expect(error).toBeInstanceOf(EventDeletionError);
    expect(error).toMatchObject({ reason: 'database', code: '23503' });
    expect(getEventDeletionMessage(error)).toContain('related data');
  });

  it('reports an owner/RLS rejection without treating it as success', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'not owned' } });
    const error = await deleteOwnedEventRow('event-uuid', 'other-user').catch((caught) => caught);
    expect(error).toMatchObject({ reason: 'not-authorized', code: '42501' });
    expect(getEventDeletionMessage(error)).toBe('You do not have permission to delete this event.');
  });
});
