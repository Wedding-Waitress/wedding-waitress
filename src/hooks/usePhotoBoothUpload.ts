// Guest-side photo booth upload — register → storage upload → finalize
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PhotoBoothUploadOptions {
  token: string;
  mime: string; // image/jpeg | image/png | image/webp
  uploaderName: string;
  filename: string;
  isStrip?: boolean;
}

export function usePhotoBoothUpload() {
  // Keep the same reservation after transfer/finalization errors. A lost response
  // must not create a second gallery item on retry.
  const reservations = useRef(new WeakMap<Blob, Map<string, {item_id: string; storage_path: string; upload_token: string; transferred: boolean; done: boolean}>>());
  const inFlight = useRef<{blob: Blob; key: string; task: Promise<boolean>} | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadOne = useCallback(async (blob: Blob, opts: PhotoBoothUploadOptions): Promise<boolean> => {
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const key = JSON.stringify([opts.token, opts.filename, !!opts.isStrip]);
      let files = reservations.current.get(blob);
      if (!files) { files = new Map(); reservations.current.set(blob, files); }
      let checkpoint = files.get(key);
      if (checkpoint?.done) return true;
      if (!checkpoint) {
        const { data, error: regErr } = await (supabase as any).rpc('register_event_photobooth_upload', {
          _token: opts.token, _mime_type: opts.mime, _byte_size: blob.size,
          _uploader_name: opts.uploaderName || null, _filename: opts.filename, _is_strip: !!opts.isStrip,
        });
        if (regErr) throw new Error(regErr.message || 'Could not register photo');
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.item_id || !row.storage_path || !row.upload_token) throw new Error('Could not register photo');
        checkpoint = {...row, transferred: false, done: false};
        files.set(key, checkpoint!);
      }
      const {item_id, storage_path, upload_token} = checkpoint!;
      if (!checkpoint!.transferred) {
        const {error: upErr} = await supabase.storage.from('event-media').upload(storage_path, blob, {contentType: opts.mime, upsert: false});
        // This exact random reservation path belongs to this Blob. A previous
        // transfer can have committed even if its response was lost.
        const exists = (upErr && 'statusCode' in upErr && String(upErr.statusCode) === '409') || /already exists|duplicate/i.test(upErr?.message || '');
        if (upErr && !exists) throw new Error(upErr.message || 'Upload failed');
        checkpoint!.transferred = true;
      }
      setProgress(100);

      const { data: okData, error: finErr } = await (supabase as any).rpc('finalize_event_media_upload', {
        _item_id: item_id,
        _upload_token: upload_token,
      });
      if (finErr || !okData) {
        throw new Error('Could not finalize photo');
      }
      checkpoint!.done = true;
      return true;
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
      return false;
    } finally { setUploading(false); }
  }, []);

  const upload = useCallback((blob: Blob, opts: PhotoBoothUploadOptions): Promise<boolean> => {
    const key = JSON.stringify([opts.token, opts.filename, !!opts.isStrip]);
    if (inFlight.current) {
      // Coalesce double taps on the same file; never claim a different file saved.
      return inFlight.current.blob === blob && inFlight.current.key === key
        ? inFlight.current.task : Promise.resolve(false);
    }
    const task = uploadOne(blob, opts).finally(() => { inFlight.current = null; });
    inFlight.current = {blob, key, task};
    return task;
  }, [uploadOne]);

  const reset = useCallback(() => { setProgress(0); setError(null); }, []);

  return { upload, progress, uploading, error, reset };
}
