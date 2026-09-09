import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ results: [] as any[], upload: vi.fn(), remove: vi.fn(), download: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  supabaseUrl: 'https://test.supabase.co',
  from: () => {
    const query: any = {};
    for (const key of ['select', 'eq', 'is', 'update', 'upsert']) query[key] = () => query;
    for (const key of ['single', 'maybeSingle']) query[key] = async () => mock.results.shift();
    query.then = (resolve: any, reject: any) => Promise.resolve(mock.results.shift()).then(resolve, reject);
    return query;
  },
  storage: { from: () => ({ download: mock.download, upload: mock.upload, remove: mock.remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/live-view-uploads/${path}` } }) }) },
} }));
import { syncEventHeroImage, usesEventHero } from './eventHeroImage';
const result = (data: any) => ({ data, error: null });
const event = { id: 'event', user_id: 'owner', event_image_path: 'owner/drafts/draft/photo.png' };
beforeEach(() => {
  vi.clearAllMocks(); mock.results = [];
  mock.download.mockResolvedValue(result(new Blob(['image'], { type: 'image/png' })));
  mock.upload.mockResolvedValue(result({})); mock.remove.mockResolvedValue(result([]));
});
describe('saved event photo as guest hero', () => {
  it('preserves custom and explicitly hidden images', async () => {
    for (const config of [{ file_url: 'legacy-custom' }, { source: 'custom', file_url: 'custom' }, { source: 'none' }]) {
      mock.results = [result(event), result({ id: 'module', hero_image_config: config })];
      await syncEventHeroImage('event');
    }
    expect(mock.download).not.toHaveBeenCalled();
    expect(usesEventHero({})).toBe(true);
  });
  it('publishes only the saved event image to an event-scoped public copy', async () => {
    mock.results = [result(event), result({ id: 'module', hero_image_config: {} }), result(event), result([{ id: 'module' }])];
    await syncEventHeroImage('event');
    expect(mock.download).toHaveBeenCalledWith(event.event_image_path);
    expect(mock.upload.mock.calls[0][0]).toMatch(/^owner\/event\/hero_image\/event-.+\.png$/);
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('does not re-upload an already synced image', async () => {
    mock.results = [result(event), result({ id: 'module', hero_image_config: { source: 'event', source_path: event.event_image_path, file_url: 'saved' } })];
    await syncEventHeroImage('event');
    expect(mock.upload).not.toHaveBeenCalled();
  });
  it('removes the new copy if a concurrent custom choice wins', async () => {
    mock.results = [result(event), result({ id: 'module', hero_image_config: {} }), result(event), result([])];
    await syncEventHeroImage('event');
    expect(mock.remove).toHaveBeenCalledWith([mock.upload.mock.calls[0][0]]);
  });
  it('cleans up a failed publication while preserving the original private file', async () => {
    mock.results = [result(event), result({ id: 'module', hero_image_config: {} }), result(event), { data: null, error: new Error('save failed') }];
    await expect(syncEventHeroImage('event')).rejects.toThrow('save failed');
    expect(mock.remove).toHaveBeenCalledWith([mock.upload.mock.calls[0][0]]);
    expect(mock.remove).not.toHaveBeenCalledWith([event.event_image_path]);
  });
});
