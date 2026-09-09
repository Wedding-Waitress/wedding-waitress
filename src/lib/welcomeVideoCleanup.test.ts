import { describe, it, expect, vi } from 'vitest';
import { deleteStreamVideo, removeWelcomeVideos, retireVideos, checkWelcomeVideo } from '../../supabase/functions/_shared/welcomeVideo';
const uid = 'a'.repeat(32);
function database(owner = 'owner') {
  const state = { config: { video_url: `https://iframe.cloudflarestream.com/${uid}` } as any, rows: [{ id: 'upload', event_id: 'event', user_id: owner, cloudflare_uid: uid, status: 'ready' }], failSave: false };
  const db = { from(table: string) {
    const filters: Array<[string, any]> = []; let action = 'select'; let patch: any;
    const query: any = {
      select: () => query, order: () => query, eq: (key: string, value: any) => { filters.push([key, value]); return query; },
      is: (key: string, value: any) => { filters.push([key, value]); return query; },
      update: (value: any) => { action = 'update'; patch = value; return query; },
      delete: () => { action = 'delete'; return query; },
      single: () => query,
      then(resolve: any, reject: any) {
        return Promise.resolve().then(() => {
          if (table === 'events') return { data: filters.some(([k, v]) => k === 'user_id' && v !== owner) ? null : { id: 'event' }, error: null };
          if (table === 'live_view_module_settings') {
            if (action === 'select') return { data: { welcome_video_config: state.config }, error: null };
            if (state.failSave) return { data: null, error: new Error('Database unavailable') };
            const expected = filters.find(([k]) => k === 'welcome_video_config')?.[1];
            if (expected == null ? state.config != null : JSON.stringify(state.config) !== expected) return { data: [], error: null };
            state.config = patch.welcome_video_config;
            return { data: [{ event_id: 'event' }], error: null };
          }
          const matching = state.rows.filter(row => filters.every(([key, value]) => (row as any)[key] === value));
          if (action === 'update') matching.forEach(row => Object.assign(row, patch));
          if (action === 'delete') state.rows = state.rows.filter(row => !matching.includes(row));
          return { data: matching.map(row => ({ ...row })), error: null };
        }).then(resolve, reject);
      },
    }; return query;
  } }; return { db, state };
}
describe('hosted welcome video cleanup', () => {
  it('checks ownership before touching Cloudflare or configuration', async () => {
    const { db, state } = database('someone-else'); const remove = vi.fn();
    await expect(removeWelcomeVideos(db, 'event', 'owner', remove)).rejects.toThrow('unauthorized');
    expect(remove).not.toHaveBeenCalled(); expect(state.config.video_url).toContain(uid);
  });
  it('does not delete hosted content when unpublishing fails', async () => {
    const { db, state } = database(); state.failSave = true; const remove = vi.fn();
    await expect(removeWelcomeVideos(db, 'event', 'owner', remove)).rejects.toThrow('Database unavailable');
    expect(remove).not.toHaveBeenCalled(); expect(state.rows).toHaveLength(1);
  });
  it('keeps tracking when remote deletion fails and allows a successful retry', async () => {
    const { db, state } = database();
    await expect(removeWelcomeVideos(db, 'event', 'owner', vi.fn().mockRejectedValue(new Error('offline')))).rejects.toThrow('offline');
    expect(state.rows).toHaveLength(1); expect(state.rows[0].status).toBe('error');
    const remove = vi.fn().mockResolvedValue(undefined);
    await removeWelcomeVideos(db, 'event', 'owner', remove);
    expect(remove).toHaveBeenCalledWith(uid); expect(state.rows).toHaveLength(0); expect(state.config.video_url).toBeUndefined();
  });
  it('never retires a currently published video', async () => {
    const { db, state } = database(); const remove = vi.fn();
    await retireVideos(db, 'event', 'owner', [...state.rows], remove);
    expect(remove).not.toHaveBeenCalled(); expect(state.rows).toHaveLength(1);
  });
  it('deletes only the retired upload after a replacement has been published', async () => {
    const { db, state } = database(); state.config = { video_url: 'new-video' }; const remove = vi.fn().mockResolvedValue(undefined);
    await retireVideos(db, 'event', 'owner', [...state.rows], remove);
    expect(state.config.video_url).toBe('new-video'); expect(state.rows).toHaveLength(0);
  });
  it('treats an already deleted remote video as success but rejects provider errors', async () => {
    await expect(deleteStreamVideo(uid, 'account', 'token', vi.fn().mockResolvedValue({ ok: false, status: 404 }))).resolves.toBeUndefined();
    await expect(deleteStreamVideo(uid, 'account', 'token', vi.fn().mockResolvedValue({ ok: false, status: 503 }))).rejects.toThrow('cleanup failed');
    const request = vi.fn(); await expect(deleteStreamVideo('../foreign', 'account', 'token', request)).rejects.toThrow('identifier'); expect(request).not.toHaveBeenCalled();
  });
});

const readyResponse = () => ({ ok: true, json: async () => ({ result: { status: { state: 'ready' }, duration: 3.135 } }) });
describe('welcome video replacement publication', () => {
  it('rejects a UID from another event before calling the provider', async () => {
    const { db } = database(); const request = vi.fn();
    await expect(checkWelcomeVideo(db, 'event', 'owner', 'b'.repeat(32), 'account', 'token', request)).rejects.toThrow('does not belong');
    expect(request).not.toHaveBeenCalled();
  });
  it('ignores stale polling when a newer upload exists', async () => {
    const { db, state } = database(); state.rows.unshift({ ...state.rows[0], id: 'new', cloudflare_uid: 'b'.repeat(32) }); const request = vi.fn();
    await expect(checkWelcomeVideo(db, 'event', 'owner', uid, 'account', 'token', request)).resolves.toEqual({ status: 'superseded' });
    expect(request).not.toHaveBeenCalled();
  });
  it('rounds duration and publishes the new video before cleaning the previous one', async () => {
    const { db, state } = database(); const newUid = 'b'.repeat(32);
    state.rows.unshift({ ...state.rows[0], id: 'new', cloudflare_uid: newUid, status: 'uploading' });
    const request = vi.fn().mockImplementation(async (_url, init) => {
      if (init?.method === 'DELETE') expect(state.config.video_url).toContain(newUid);
      return readyResponse();
    });
    const result = await checkWelcomeVideo(db, 'event', 'owner', newUid, 'account', 'token', request);
    expect(result.duration_seconds).toBe(3); expect(state.rows).toHaveLength(1); expect(state.rows[0].cloudflare_uid).toBe(newUid);
    expect(request.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
  });
  it('preserves the old video when publication fails', async () => {
    const { db, state } = database(); const newUid = 'b'.repeat(32); state.failSave = true;
    state.rows.unshift({ ...state.rows[0], id: 'new', cloudflare_uid: newUid, status: 'uploading' });
    const request = vi.fn().mockResolvedValue(readyResponse());
    await expect(checkWelcomeVideo(db, 'event', 'owner', newUid, 'account', 'token', request)).rejects.toThrow('Database unavailable');
    expect(state.config.video_url).toContain(uid); expect(state.rows).toHaveLength(2); expect(request).toHaveBeenCalledTimes(1);
  });
});
