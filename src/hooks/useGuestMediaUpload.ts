// Guest-side upload hook — register → tus resumable upload → finalize
import { useCallback, useState } from 'react';
import * as tus from 'tus-js-client';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { ValidationResult, MediaLimits } from '@/lib/mediaValidation';
import { normaliseGalleryAlbum, type ManageableGalleryAlbum } from '@/lib/galleryAlbumOptions';

export interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'done' | 'error' | 'skipped';
  percent: number;
  error?: string;
}

export interface UploadOptions {
  token: string;
  uploaderName: string;
  caption?: string;
  guestbookMessage?: string;
  album?: ManageableGalleryAlbum | null;
  limits: MediaLimits;
}

async function uploadOne(
  vf: ValidationResult,
  opts: UploadOptions,
  onProgress: (p: number) => void,
): Promise<void> {
  if (!vf.kind) throw new Error('Unsupported file type');

  const { data, error } = await (supabase as any).rpc('register_event_media_upload', {
    _token: opts.token,
    _kind: vf.kind,
    _mime_type: vf.mime,
    _byte_size: vf.size,
    _duration_sec: vf.duration ?? null,
    _uploader_name: opts.uploaderName || null,
    _caption: opts.caption || null,
    _guestbook_message: opts.guestbookMessage || null,
    _filename: vf.file.name,
    _album: normaliseGalleryAlbum(opts.album),
  });
  if (error) throw new Error(error.message || 'Could not register upload');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.item_id) throw new Error('Could not register upload');

  const { item_id, storage_path, upload_token } = row as {
    item_id: string; storage_path: string; upload_token: string;
  };

  const { data: sessionData } = await supabase.auth.getSession();
  const bearer = sessionData?.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(vf.file, {
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
        contentType: vf.mime,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => reject(err),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then(prev => {
      if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    }).catch(() => upload.start());
  });

  const { data: okData, error: finErr } = await (supabase as any).rpc('finalize_event_media_upload', {
    _item_id: item_id,
    _upload_token: upload_token,
  });
  if (finErr || !okData) {
    await (supabase as any).rpc('fail_event_media_upload', { _item_id: item_id, _upload_token: upload_token });
    throw new Error('Could not finalize upload');
  }
}

export function useGuestMediaUpload() {
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  /**
   * Upload an array of already-validated files one-by-one.
   * Invalid items must be marked ok=false; they are skipped (not aborted)
   * so the remaining files still upload.
   */
  const uploadFiles = useCallback(async (validated: ValidationResult[], opts: UploadOptions) => {
    setUploading(true);
    const init: UploadProgress[] = validated.map(v => ({
      fileName: v.fileName,
      status: v.ok ? 'pending' : 'error',
      percent: 0,
      error: v.ok ? undefined : v.reasonText,
    }));
    setProgress(init);

    for (let i = 0; i < validated.length; i++) {
      const vf = validated[i];
      if (!vf.ok) continue; // already marked error, skip silently in the queue
      setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'uploading', percent: 0, error: undefined } : x));
      try {
        await uploadOne(vf, opts, (pct) =>
          setProgress(p => p.map((x, idx) => idx === i ? { ...x, percent: pct } : x)),
        );
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'done', percent: 100 } : x));
      } catch (e: any) {
        const msg = e?.message || 'Upload failed';
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'error', error: msg } : x));
        // continue with next file
      }
    }
    setUploading(false);
  }, []);

  const reset = useCallback(() => setProgress([]), []);

  return { uploadFiles, progress, uploading, reset };
}
