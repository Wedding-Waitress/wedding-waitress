// Guest-side upload hook — register → tus resumable upload → finalize
import { useCallback, useState } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { validateFile, ValidatedFile, MediaLimits } from '@/lib/mediaValidation';

// Derive the Storage endpoint + anon key from the shared Supabase client config.
// Vite injects VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY at build time
// from the connected Lovable Cloud / Supabase project.
const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ?? 'https://xytxkidpourwdbzzwcdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  percent: number;
  error?: string;
}

export interface UploadOptions {
  token: string;
  uploaderName: string;
  caption?: string;
  guestbookMessage?: string;
  limits: MediaLimits;
}

async function uploadOne(
  vf: ValidatedFile,
  opts: UploadOptions,
  onProgress: (p: number) => void,
): Promise<void> {
  // 1) Register pending row
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
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.item_id) throw new Error('Failed to register upload');

  const { item_id, storage_path, upload_token } = row as {
    item_id: string; storage_path: string; upload_token: string;
  };

  // 2) Resumable upload via Supabase tus endpoint.
  //    Prefer the signed-in user's session token if present, otherwise fall back
  //    to the project's publishable (anon) key — guest uploads are unauthenticated.
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

  // 3) Finalize
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

  const uploadFiles = useCallback(async (files: File[], opts: UploadOptions) => {
    setUploading(true);
    const init: UploadProgress[] = files.map(f => ({ fileName: f.name, status: 'pending', percent: 0 }));
    setProgress(init);

    // Validate all first
    const validated: ValidatedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const vf = await validateFile(files[i], opts.limits);
        validated.push(vf);
      } catch (e: any) {
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'error', error: e.message } : x));
      }
    }

    // Upload sequentially
    for (let i = 0; i < files.length; i++) {
      const vf = validated.find(v => v.file === files[i]);
      if (!vf) continue;
      setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'uploading', percent: 0 } : x));
      try {
        await uploadOne(vf, opts, (pct) =>
          setProgress(p => p.map((x, idx) => idx === i ? { ...x, percent: pct } : x)),
        );
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'done', percent: 100 } : x));
      } catch (e: any) {
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'error', error: e.message || 'Upload failed' } : x));
      }
    }
    setUploading(false);
  }, []);

  const reset = useCallback(() => setProgress([]), []);

  return { uploadFiles, progress, uploading, reset };
}
