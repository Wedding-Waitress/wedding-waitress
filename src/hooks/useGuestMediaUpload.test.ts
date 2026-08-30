import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ValidationResult } from '@/lib/mediaValidation';

const { rpc, getSession } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getSession: vi.fn(async () => ({ data: { session: null } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  supabase: {
    rpc,
    auth: { getSession },
  },
}));

vi.mock('tus-js-client', () => ({
  Upload: class MockUpload {
    private options: { onProgress: (sent: number, total: number) => void; onSuccess: () => void };

    constructor(_file: File, options: { onProgress: (sent: number, total: number) => void; onSuccess: () => void }) {
      this.options = options;
    }

    findPreviousUploads() {
      return Promise.resolve([]);
    }

    start() {
      this.options.onProgress(1, 1);
      this.options.onSuccess();
    }
  },
}));

import { useGuestMediaUpload } from './useGuestMediaUpload';

const file = new File(['photo'], 'memory.jpg', { type: 'image/jpeg' });
const validated: ValidationResult = {
  file,
  fileName: file.name,
  kind: 'photo',
  mime: 'image/jpeg',
  mimeInferred: false,
  size: file.size,
  duration: null,
  durationUnknown: false,
  ok: true,
};

const limits = {
  max_photo_bytes: 10_000,
  max_video_bytes: 10_000,
  max_video_duration_sec: 120,
  allowed_photo_mimes: ['image/jpeg'],
  allowed_video_mimes: ['video/mp4'],
};

describe('useGuestMediaUpload album persistence', () => {
  beforeEach(() => {
    rpc.mockReset();
    getSession.mockClear();
    rpc.mockImplementation(async (name: string) => {
      if (name === 'register_event_media_upload') {
        return { data: [{ item_id: 'item-1', storage_path: 'event/item-1.jpg', upload_token: 'upload-token' }], error: null };
      }
      if (name === 'finalize_event_media_upload') return { data: true, error: null };
      return { data: null, error: null };
    });
  });

  it.each([
    ['Ceremony', 'Ceremony'],
    ['Reception', 'Reception'],
    ['Other', 'Other'],
    [undefined, 'Other'],
  ] as const)('registers %s uploads as %s', async (album, expectedAlbum) => {
    const { result } = renderHook(() => useGuestMediaUpload());

    await act(async () => {
      await result.current.uploadFiles([validated], {
        token: 'gallery-token',
        uploaderName: 'Guest Name',
        album,
        limits,
      });
    });

    await waitFor(() => expect(result.current.uploading).toBe(false));
    expect(rpc).toHaveBeenCalledWith('register_event_media_upload', expect.objectContaining({
      _album: expectedAlbum,
    }));
    expect(rpc).toHaveBeenCalledWith('finalize_event_media_upload', {
      _item_id: 'item-1',
      _upload_token: 'upload-token',
    });
  });
});
