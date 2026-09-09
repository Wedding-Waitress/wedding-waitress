import { describe, expect, it } from 'vitest';
import { retiredLiveViewAsset } from './liveViewAssetCleanup';
const origin = 'https://example.supabase.co';
const asset = `${origin}/storage/v1/object/public/live-view-uploads/owner/event/menu/old.png`;
describe('retired live view assets', () => {
  it('cleans up the old event upload after replacement or removal', () => {
    expect(retiredLiveViewAsset(asset, 'new', [], 'event', origin)).toEqual({ bucket: 'live-view-uploads', path: 'owner/event/menu/old.png' });
    expect(retiredLiveViewAsset(asset, undefined, [], 'event', origin)).not.toBeNull();
  });
  it('preserves unchanged files and files referenced by another module', () => {
    expect(retiredLiveViewAsset(asset, asset, [], 'event', origin)).toBeNull();
    expect(retiredLiveViewAsset(asset, 'new', [asset], 'event', origin)).toBeNull();
  });
  it('does not delete another event, another host or a protected bucket', () => {
    expect(retiredLiveViewAsset(asset, null, [], 'other-event', origin)).toBeNull();
    expect(retiredLiveViewAsset(asset, null, [], 'event', 'https://other.supabase.co')).toBeNull();
    expect(retiredLiveViewAsset(asset.replace('live-view-uploads', 'event-branding'), null, [], 'event', origin)).toBeNull();
  });
  it('rejects encoded path separators', () => {
    expect(retiredLiveViewAsset(asset.replace('old.png', '..%2Fother.png'), null, [], 'event', origin)).toBeNull();
  });
});
