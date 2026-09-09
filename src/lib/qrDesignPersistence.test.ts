import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  supabaseUrl: 'https://test.supabase.co',
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: m.read }) }), upsert: m.save }),
  storage: { from: () => ({ remove: m.remove }) },
} }));
import { createQRSaveQueue, ownedQRLogoPath, persistQRDesign } from './qrDesignPersistence';
const old = 'https://test.supabase.co/storage/v1/object/public/qr-assets/owner/event/qr-logo/old.png';
const settings = { event_id: 'event', user_id: 'owner', center_image_url: null };
beforeEach(() => {
  vi.resetAllMocks(); m.read.mockResolvedValue({ data: { center_image_url: old }, error: null });
  m.save.mockResolvedValue({ error: null }); m.remove.mockResolvedValue({ error: null });
});
describe('QR logo persistence', () => {
  it('preserves the saved logo when its replacement is rejected', async () => {
    m.save.mockResolvedValue({ error: new Error('rejected') });
    await expect(persistQRDesign(settings, new Set(), () => null)).rejects.toThrow('rejected');
    expect(m.remove).not.toHaveBeenCalled();
  });
  it('removes an old logo only after a successful reset save', async () => {
    await persistQRDesign(settings, new Set(), () => null);
    expect(m.save.mock.invocationCallOrder[0]).toBeLessThan(m.remove.mock.invocationCallOrder[0]);
    expect(m.remove).toHaveBeenCalledWith(['owner/event/qr-logo/old.png']);
  });
  it('retains a logo currently selected by a newer edit', async () => {
    await persistQRDesign(settings, new Set([old]), () => old);
    expect(m.remove).not.toHaveBeenCalled();
  });
  it('retains failed cleanup for a subsequent retry', async () => {
    const pending = new Set<string>(); m.remove.mockResolvedValueOnce({ error: new Error('offline') });
    expect(await persistQRDesign(settings, pending, () => null)).toEqual({ cleanupFailed: true });
    expect(pending.has(old)).toBe(true);
    m.read.mockResolvedValue({ data: { center_image_url: null }, error: null });
    expect(await persistQRDesign(settings, pending, () => null)).toEqual({ cleanupFailed: false });
    expect(pending.size).toBe(0);
  });
  it('does not delete other events, owners, buckets or external assets', () => {
    for (const url of [old.replace('/event/', '/other/'), old.replace('/owner/', '/other/'), old.replace('qr-assets', 'invitations'), old.replace('test.supabase.co', 'other.supabase.co'), old.replace('old.png', 'nested%2Ffile.png')]) {
      expect(ownedQRLogoPath(url, 'owner', 'event', 'https://test.supabase.co')).toBeNull();
    }
  });
  it('serializes overlapping saves and continues after a rejected save', async () => {
    const queue = createQRSaveQueue(); const order: number[] = [];
    let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
    const first = queue(async () => { order.push(1); await wait; throw new Error('failed'); });
    const rejection = expect(first).rejects.toThrow('failed');
    const second = queue(async () => { order.push(2); });
    await Promise.resolve(); expect(order).toEqual([1]); release();
    await rejection; await second; expect(order).toEqual([1, 2]);
  });
});
