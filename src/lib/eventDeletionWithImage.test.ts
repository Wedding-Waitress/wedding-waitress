import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  results: [] as Array<{ data: unknown; error: unknown }>,
  update: vi.fn(), remove: vi.fn(), download: vi.fn(), upload: vi.fn(), deleteRow: vi.fn(),
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
      select: vi.fn(() => query), eq: vi.fn(() => query), neq: vi.fn(() => query),
      is: vi.fn(() => query), limit: vi.fn(() => query), maybeSingle: vi.fn(() => query),
      update: vi.fn((values) => { mocks.update(values); return query; }),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  }),
  storage: { from: vi.fn(() => ({ remove: mocks.remove, download: mocks.download, upload: mocks.upload })) },
} }));

import { deleteOwnedEventWithImage } from './eventDeletionWithImage';

const path = 'owner/events/event/photo.png';
const row = { id: 'event', user_id: 'owner' };
const result = (data: unknown) => ({ data, error: null });
const image = new Blob(['test'], { type: 'image/png' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.results = [result({ event_image_path: path }), result([]), result([{ id: 'event' }])];
  mocks.download.mockResolvedValue(result(image));
  mocks.remove.mockResolvedValue(result([{ name: path }]));
  mocks.upload.mockResolvedValue(result({ path }));
  mocks.deleteRow.mockResolvedValue(row);
});

describe('event deletion image cleanup', () => {
  it('verifies image removal before deleting the event that grants storage access', async () => {
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.update).toHaveBeenCalledWith({ event_image_path: null });
    expect(mocks.remove).toHaveBeenCalledWith([path]);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteRow.mock.invocationCallOrder[0]);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('keeps the event and restores its attachment when storage silently deletes zero files', async () => {
    mocks.remove.mockResolvedValue(result([]));
    mocks.results.push(result([{ id: 'event' }]));
    await expect(deleteOwnedEventWithImage('event', 'owner')).rejects.toMatchObject({ reason: 'image-cleanup' });
    expect(mocks.deleteRow).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenLastCalledWith({ event_image_path: path });
  });

  it('restores the file and attachment when the database rejects event deletion', async () => {
    mocks.deleteRow.mockRejectedValue(new Error('Database failure'));
    mocks.results.push(result([{ id: 'event' }]));
    await expect(deleteOwnedEventWithImage('event', 'owner')).rejects.toThrow('Database failure');
    expect(mocks.upload).toHaveBeenCalledWith(path, image, { contentType: 'image/png', upsert: false });
    expect(mocks.update).toHaveBeenLastCalledWith({ event_image_path: path });
  });

  it('does not touch images still referenced by another event', async () => {
    mocks.results = [result({ event_image_path: path }), result([{ id: 'other-event' }])];
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('deletes events without images without any storage operations', async () => {
    mocks.results = [result({ event_image_path: null })];
    await expect(deleteOwnedEventWithImage('event', 'owner')).resolves.toEqual(row);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it('does not touch storage or delete a missing or unowned event', async () => {
    mocks.results = [result(null)];
    await expect(deleteOwnedEventWithImage('event', 'owner')).rejects.toMatchObject({ reason: 'not-authorized' });
    expect(mocks.deleteRow).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
