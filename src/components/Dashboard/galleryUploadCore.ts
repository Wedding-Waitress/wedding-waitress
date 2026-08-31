import { Upload } from 'tus-js-client';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';

export type GalleryUploadPhase = 'validating' | 'uploading' | 'saving' | 'complete';

export interface GalleryUploadProgress {
  phase: GalleryUploadPhase;
  percent: number;
  message: string;
}

export type GalleryUploadProgressHandler = (progress: GalleryUploadProgress) => void;

const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;

export const isSupportedGalleryImage = (file: File) => /^image\/(png|jpe?g)$/i.test(file.type);

export const formatUploadBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

export const getReadableUploadError = (err: unknown, fallback = 'Upload failed. Please retry or contact support.') => {
  const anyErr = err as { message?: string; status?: number; statusCode?: string | number; name?: string } | null;
  const statusCode = String(anyErr?.statusCode ?? anyErr?.status ?? '');
  const message = anyErr?.message || (err instanceof Error ? err.message : fallback);

  if (statusCode === '413' || /maximum allowed size|exceeded/i.test(message)) {
    return 'Upload failed: The object exceeded the current storage limit. The accepted maximum is 500 MB per image; if this file is below 500 MB, please retry or contact support.';
  }

  if (/timeout|network|fetch/i.test(message)) {
    return `Upload failed: ${message}. Please keep this page open and retry on a stable connection.`;
  }

  return `Upload failed: ${message}`;
};

export const getTransformedPublicUrl = (bucket: string, path: string) => (
  supabase.storage.from(bucket).getPublicUrl(path, {
    transform: { width: 800, quality: 75, resize: 'contain' },
  }).data.publicUrl
);

export const uploadLargeFileToStorage = async (
  bucket: string,
  path: string,
  file: File,
  onProgress?: GalleryUploadProgressHandler,
) => {
  onProgress?.({ phase: 'uploading', percent: 0, message: 'Uploading original image… 0%' });
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || SUPABASE_ANON_KEY;

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = bytesTotal > 0 ? Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100)) : 0;
        onProgress?.({ phase: 'uploading', percent, message: `Uploading original image… ${percent}%` });
      },
      onSuccess: () => {
        onProgress?.({ phase: 'saving', percent: 100, message: 'Upload complete. Saving image to gallery…' });
        resolve();
      },
      onError: reject,
    });

    upload.start();
  });
};
