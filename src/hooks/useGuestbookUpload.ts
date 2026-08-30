// Guest-side guestbook upload hook — register → tus resumable upload → finalize
import { useCallback, useState } from 'react';
import * as tus from 'tus-js-client';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';

export interface GuestbookUploadOptions {
  token: string;
  kind: 'video' | 'audio';
  mime: string;
  durationSec: number;
  uploaderName: string;
  message?: string;
  filename: string;
}

export function useGuestbookUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Returns the created media item id on success, or null on failure. */
  const upload = useCallback(async (blob: Blob, opts: GuestbookUploadOptions): Promise<string | null> => {
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const { data, error: regErr } = await (supabase as any).rpc('register_event_guestbook_upload', {
        _token: opts.token,
        _kind: opts.kind,
        _mime_type: opts.mime,
        _byte_size: blob.size,
        _duration_sec: opts.durationSec,
        _uploader_name: opts.uploaderName || null,
        _message: opts.message || null,
        _filename: opts.filename,
      });
      if (regErr) throw new Error(regErr.message || 'Could not register recording');
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.item_id) throw new Error('Could not register recording');

      const { item_id, storage_path, upload_token } = row as { item_id: string; storage_path: string; upload_token: string };
      const { data: sessionData } = await supabase.auth.getSession();
      const bearer = sessionData?.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;

      const file = new File([blob], opts.filename, { type: opts.mime });
      await new Promise<void>((resolve, reject) => {
        const up = new tus.Upload(file, {
          endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          headers: {
            authorization: `Bearer ${bearer}`,
            apikey: SUPABASE_PUBLISHABLE_KEY,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'event-media',
            objectName: storage_path,
            contentType: opts.mime,
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (err) => reject(err),
          onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
          onSuccess: () => resolve(),
        });
        up.findPreviousUploads().then(prev => {
          if (prev.length > 0) up.resumeFromPreviousUpload(prev[0]);
          up.start();
        }).catch(() => up.start());
      });

      const { data: okData, error: finErr } = await (supabase as any).rpc('finalize_event_media_upload', {
        _item_id: item_id,
        _upload_token: upload_token,
      });
      if (finErr || !okData) {
        await (supabase as any).rpc('fail_event_media_upload', { _item_id: item_id, _upload_token: upload_token });
        throw new Error('Could not finalize recording');
      }
      setUploading(false);
      setProgress(100);
      return item_id;
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
      setUploading(false);
      return null;
    }
  }, []);

  const reset = useCallback(() => { setProgress(0); setError(null); }, []);

  return { upload, progress, uploading, error, reset };
}
