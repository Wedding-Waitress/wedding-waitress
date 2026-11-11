import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  results: [] as Array<{ data: unknown; error: unknown }>,
  remove: vi.fn(), download: vi.fn(), deleteRow: vi.fn(),
}));
vi.mock('./eventDeletion', async () => ({
  ...await vi.importActual<typeof import('./eventDeletion')>('./eventDeletion'),
  deleteOwnedEventRow: mocks.deleteRow,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: vi.fn(() => {
    const result = mocks.results.shift();
    if (!result) throw new Error('Unexpected query');
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query),
      limit: vi.fn(() => query), maybeSingle: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  }),
  storage: { from: vi.fn(() => ({ remove: mocks.remove, download: mocks.download })) },
} }));

import { deleteOwnedEventWithImage } from './eventDeletionWithImage';

const path = 'owner/events/event/photo.png';
const row = { id: 'event', user_id: 'owner' };
const result = (data: unknown) => ({ data, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.results = [result({ user_id: 'owner', event_image_path: path }), result([])];
  mocks.remove.mockResolvedValue(result([{ name: path }]));
  mocks.deleteRow.mockResolvedValue(row);
});
afterEach(() => vi.restoreAllMocks());

describe('event deletion image cleanup', () => {
  it('deletes through the secure RPC before attempting best-effort image cleanup', async () => {
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.deleteRow).toHaveBeenCalledWith('event', 'owner');
    expect(mocks.remove).toHaveBeenCalledWith([path]);
    expect(mocks.deleteRow.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it('allows the secure deletion RPC to succeed when Storage download or removal is unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.download.mockRejectedValue(new Error('download unavailable'));
    mocks.remove.mockResolvedValue({ data: null, error: { statusCode: '503', message: 'Storage unavailable' } });
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.deleteRow).toHaveBeenCalledWith('event', 'owner');
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith([path]);
    expect(console.warn).toHaveBeenCalledWith('Event image cleanup failed after event deletion', { stage: 'remove', code: '503' });
  });

  it('does not block deletion when Storage reports zero removed files', async () => {
    mocks.remove.mockResolvedValue(result([]));
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.deleteRow).toHaveBeenCalledWith('event', 'owner');
    expect(mocks.remove).toHaveBeenCalledWith([path]);
  });

  it.each([
    'not-a-storage-path',
    'other-owner/events/event/photo.png',
    'owner/events/other-event/photo.png',
    'owner/unsupported/event/photo.png',
  ])('deletes the event without touching storage for an invalid image path: %s', async (invalidPath) => {
    mocks.results = [result({ user_id: 'owner', event_image_path: invalidPath })];
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.deleteRow).toHaveBeenCalledWith('event', 'owner');
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('logs and skips cleanup when the surviving-reference check fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.results = [result({ user_id: 'owner', event_image_path: path }), { data: null, error: { code: '42501' } }];
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('Event image cleanup failed after event deletion', { stage: 'reference-check', code: '42501' });
  });

  it('does not touch images still referenced by another event', async () => {
    mocks.results = [result({ user_id: 'owner', event_image_path: path }), result([{ id: 'other-event' }])];
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('does not start image cleanup when the secure deletion RPC fails', async () => {
    mocks.deleteRow.mockRejectedValue(new Error('Database deletion failed'));
    await expect(deleteOwnedEventWithImage('event', 'owner')).rejects.toThrow('Database deletion failed');
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('deletes events without images without any storage operations', async () => {
    mocks.results = [result({ user_id: 'owner', event_image_path: null })];
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });


  it('validates an admin deletion against the actual event owner and cleans only that owner image', async () => {
    await expect(deleteOwnedEventWithImage('event', 'admin')).resolves.toEqual(row);
    expect(mocks.deleteRow).toHaveBeenCalledWith('event', 'owner');
    expect(mocks.remove).toHaveBeenCalledWith([path]);
  });

  it('does not treat visibility of a different owner event as permission to delete', async () => {
    mocks.deleteRow.mockRejectedValue(new Error('You do not have permission to delete this event.'));
    await expect(deleteOwnedEventWithImage('event', 'ordinary-team-member')).rejects.toThrow('permission');
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('does not call the backend without an authenticated caller', async () => {
    await expect(deleteOwnedEventWithImage('event', '')).rejects.toMatchObject({ reason: 'not-authenticated' });
    expect(mocks.deleteRow).not.toHaveBeenCalled();
  });

  it('does not touch storage or call deletion for an unreadable or missing event', async () => {
    mocks.results = [result(null)];
    await expect(deleteOwnedEventWithImage('event', 'owner')).rejects.toMatchObject({ reason: 'not-authorized' });
    expect(mocks.deleteRow).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
