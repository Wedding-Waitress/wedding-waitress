// Guest-side photo booth upload — register → storage upload → finalize
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PhotoBoothUploadOptions {
  token: string;
  mime: string; // image/jpeg | image/png | image/webp
  uploaderName: string;
  filename: string;
}

export function usePhotoBoothUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (blob: Blob, opts: PhotoBoothUploadOptions): Promise<boolean> => {
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const { data, error: regErr } = await (supabase as any).rpc('register_event_photobooth_upload', {
        _token: opts.token,
        _mime_type: opts.mime,
        _byte_size: blob.size,
        _uploader_name: opts.uploaderName || null,
        _filename: opts.filename,
      });
      if (regErr) throw new Error(regErr.message || 'Could not register photo');
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.item_id) throw new Error('Could not register photo');

      const { item_id, storage_path, upload_token } = row as { item_id: string; storage_path: string; upload_token: string };

      const { error: upErr } = await supabase.storage
        .from('event-media')
        .upload(storage_path, blob, { contentType: opts.mime, upsert: false });
      if (upErr) {
        await (supabase as any).rpc('fail_event_media_upload', { _item_id: item_id, _upload_token: upload_token });
        throw new Error(upErr.message || 'Upload failed');
      }
      setProgress(100);

      const { data: okData, error: finErr } = await (supabase as any).rpc('finalize_event_media_upload', {
        _item_id: item_id,
        _upload_token: upload_token,
      });
      if (finErr || !okData) {
        await (supabase as any).rpc('fail_event_media_upload', { _item_id: item_id, _upload_token: upload_token });
        throw new Error('Could not finalize photo');
      }
      setUploading(false);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
      setUploading(false);
      return false;
    }
  }, []);

  const reset = useCallback(() => { setProgress(0); setError(null); }, []);

  return { upload, progress, uploading, error, reset };
}
