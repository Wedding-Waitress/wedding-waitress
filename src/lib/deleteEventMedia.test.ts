import { describe, it, expect, vi } from 'vitest';
import { deleteEventMediaItems, type InvokeLike } from './deleteEventMedia';

const client = (impl: (body: any) => { data: any; error: any }): InvokeLike & { calls: any[] } => {
  const calls: any[] = [];
  return {
    calls,
    functions: {
      invoke: async (name: string, opts: { body: any }) => {
        calls.push({ name, body: opts.body });
        return impl(opts.body);
      },
    },
  };
};

const ok = (ids: string[], failed: string[] = []) =>
  client(() => ({ data: { deletedIds: ids, failedIds: failed, storageFailedPaths: [] }, error: null }));

const PHOTO = '11111111-1111-1111-1111-111111111111';
const VIDEO = '22222222-2222-2222-2222-222222222222';
const BOOTH = '33333333-3333-3333-3333-333333333333';

describe('deleteEventMediaItems', () => {
  it('deletes an individual shared photo', async () => {
    const c = ok([PHOTO]);
    const res = await deleteEventMediaItems([PHOTO], c);
    expect(res.deletedIds).toEqual([PHOTO]);
    expect(c.calls[0]).toEqual({ name: 'delete-event-media', body: { itemIds: [PHOTO] } });
  });

  it('deletes an individual shared video', async () => {
    const res = await deleteEventMediaItems([VIDEO], ok([VIDEO]));
    expect(res.deletedIds).toEqual([VIDEO]);
  });

  it('deletes an individual Digital Photo Booth capture', async () => {
    const res = await deleteEventMediaItems([BOOTH], ok([BOOTH]));
    expect(res.deletedIds).toEqual([BOOTH]);
  });

  it('bulk deletes multiple photos in one request', async () => {
    const c = ok([PHOTO, BOOTH]);
    const res = await deleteEventMediaItems([PHOTO, BOOTH], c);
    expect(res.deletedIds).toHaveLength(2);
    expect(c.calls).toHaveLength(1);
  });

  it('bulk deletes mixed photos and videos', async () => {
    const res = await deleteEventMediaItems([PHOTO, VIDEO, BOOTH], ok([PHOTO, VIDEO, BOOTH]));
    expect(res.deletedIds).toEqual([PHOTO, VIDEO, BOOTH]);
  });

  it('is idempotent / safe for repeated requests and de-duplicates IDs', async () => {
    const c = ok([PHOTO]);
    await deleteEventMediaItems([PHOTO, PHOTO], c);
    expect(c.calls[0].body.itemIds).toEqual([PHOTO]);
  });

  it('does nothing when the confirmation is cancelled (no IDs passed)', async () => {
    const c = ok([]);
    const res = await deleteEventMediaItems([], c);
    expect(res).toEqual({ deletedIds: [], failedIds: [], storageFailedPaths: [] });
    expect(c.calls).toHaveLength(0);
  });

  it('treats a zero-row database result as a FAILURE', async () => {
    const c = client(() => ({ data: { deletedIds: [], failedIds: [PHOTO], storageFailedPaths: [] }, error: null }));
    await expect(deleteEventMediaItems([PHOTO], c)).rejects.toThrow(/No media was deleted/i);
  });

  it('surfaces a denied request (another user / anonymous) as an error', async () => {
    const c = client(() => ({ data: { error: 'Authentication required' }, error: { message: 'Edge Function returned 401' } }));
    await expect(deleteEventMediaItems([PHOTO], c)).rejects.toThrow('Authentication required');
  });

  it('reports partial bulk failure without throwing', async () => {
    const res = await deleteEventMediaItems([PHOTO, VIDEO], ok([PHOTO], [VIDEO]));
    expect(res.deletedIds).toEqual([PHOTO]);
    expect(res.failedIds).toEqual([VIDEO]);
  });

  it('keeps the item deleted when only storage cleanup failed', async () => {
    const c = client(() => ({
      data: { deletedIds: [PHOTO], failedIds: [], storageFailedPaths: ['ev/abc.jpg'] },
      error: null,
    }));
    const res = await deleteEventMediaItems([PHOTO], c);
    expect(res.deletedIds).toEqual([PHOTO]);
    expect(res.storageFailedPaths).toEqual(['ev/abc.jpg']);
  });

  it('never sends more than one backend call per bulk delete (no per-item leak)', async () => {
    const c = ok([PHOTO, VIDEO]);
    await deleteEventMediaItems([PHOTO, VIDEO], c);
    expect(c.calls).toHaveLength(1);
  });
});
