import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    storage: { from: mocks.from },
    functions: { invoke: mocks.invoke },
  },
}));

import {
  createDJMCPronunciationSignedUrl,
  deleteDJMCPronunciation,
  DJMC_PRONUNCIATION_BUCKET,
  isDJMCPronunciationPath,
  uploadDJMCPronunciation,
} from './djmcPronunciationStorage';

const ownerId = '10000000-0000-4000-8000-000000000001';
const eventId = '20000000-0000-4000-8000-000000000002';
const itemId = '30000000-0000-4000-8000-000000000003';
const objectId = '40000000-0000-4000-8000-000000000004';
const path = `${ownerId}/${eventId}/${itemId}/${objectId}.webm`;

describe('DJ/MC pronunciation storage security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({
      upload: mocks.upload,
      remove: mocks.remove,
      createSignedUrl: mocks.createSignedUrl,
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/recording' }, error: null });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(objectId);
  });

  it('accepts only owner/event/item scoped object paths, never public URLs', () => {
    expect(isDJMCPronunciationPath(path)).toBe(true);
    expect(isDJMCPronunciationPath('https://example.supabase.co/storage/v1/object/public/venue-logos/pronunciations/a.webm')).toBe(false);
    expect(isDJMCPronunciationPath(`${ownerId}/${eventId}/${objectId}.webm`)).toBe(false);
  });

  it('uploads through the authorised server coordinator and accepts only a scoped returned path', async () => {
    const blob = new Blob(['recording'], { type: 'audio/webm' });
    mocks.invoke.mockResolvedValue({ data: { path }, error: null });
    await expect(uploadDJMCPronunciation(blob, { eventId, itemId })).resolves.toBe(path);

    expect(mocks.invoke).toHaveBeenCalledWith('djmc-pronunciation-media', expect.objectContaining({ body: expect.any(FormData) }));
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('creates expiring signed playback URLs and removes the actual storage object', async () => {
    await expect(createDJMCPronunciationSignedUrl(path, { eventId, itemId }))
      .resolves.toBe('https://signed.example/recording');
    mocks.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
    await deleteDJMCPronunciation(path, { eventId, itemId });

    expect(mocks.createSignedUrl).toHaveBeenCalledWith(path, 900);
    expect(mocks.invoke).toHaveBeenCalledWith('djmc-pronunciation-media', expect.objectContaining({ body: expect.any(FormData) }));
  });

  it('routes public share access through the server-side token verifier', async () => {
    mocks.invoke.mockResolvedValue({ data: { signedUrl: 'https://signed.example/shared' }, error: null });
    await expect(createDJMCPronunciationSignedUrl(path, { eventId, itemId, shareToken: 'secure-share-token' }))
      .resolves.toBe('https://signed.example/shared');

    expect(mocks.invoke).toHaveBeenCalledWith('djmc-pronunciation-media', expect.objectContaining({ body: expect.any(FormData) }));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects malformed paths before calling Storage', async () => {
    await expect(deleteDJMCPronunciation('pronunciations/public.webm', { eventId, itemId }))
      .rejects.toThrow('Invalid pronunciation recording path');
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
