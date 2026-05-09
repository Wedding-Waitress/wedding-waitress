import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TestimonialSubmissionRow {
  id: string;
  status: 'pending_review' | 'approved' | 'rejected';
  caption: string | null;
  event_name: string | null;
  created_at: string;
}

const ACCEPTED_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
const ACCEPTED_EXT = ['mp4', 'mov', 'webm', 'm4v'];
const MAX_BYTES = 200 * 1024 * 1024; // 200MB
const MAX_DURATION = 120; // seconds

const probeDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        const d = v.duration;
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(d) ? Math.round(d) : null);
      };
      v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      v.src = url;
    } catch { resolve(null); }
  });

export const useTestimonialUpload = (open: boolean) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<TestimonialSubmissionRow[]>([]);

  const refreshRecent = useCallback(async () => {
    const { data } = await (supabase.rpc as any)('get_my_testimonial_submissions', { p_limit: 5 });
    if (data) setRecent(data as TestimonialSubmissionRow[]);
  }, []);

  useEffect(() => { if (open) refreshRecent(); }, [open, refreshRecent]);

  const submit = useCallback(async (params: {
    file: File;
    caption?: string;
    eventName?: string;
    consentApproved: boolean;
  }) => {
    setError(null);
    const { file, caption, eventName, consentApproved } = params;

    if (!consentApproved) { setError('Please approve the consent to continue.'); return false; }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXT.includes(ext)) {
      setError('Unsupported file type. Use MP4, MOV, or WEBM.'); return false;
    }
    if (file.size > MAX_BYTES) { setError('File is too large (max 200MB).'); return false; }

    const duration = await probeDuration(file);
    if (duration !== null && duration > MAX_DURATION) {
      setError(`Video is too long (${duration}s). Max ${MAX_DURATION} seconds.`); return false;
    }

    setUploading(true);
    setProgress(10);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error('You must be signed in.');
      const userId = userData.user.id;
      const fileName = `${crypto.randomUUID()}.${ext || 'mp4'}`;
      const path = `${userId}/${fileName}`;

      setProgress(25);
      const { error: upErr } = await supabase.storage
        .from('testimonial-videos')
        .upload(path, file, { contentType: file.type || 'video/mp4', upsert: false });
      if (upErr) throw upErr;

      setProgress(80);
      const { error: insErr } = await (supabase.from as any)('testimonial_submissions').insert({
        user_id: userId,
        storage_path: path,
        mime_type: file.type || null,
        duration_seconds: duration,
        size_bytes: file.size,
        caption: caption?.trim() || null,
        event_name: eventName?.trim() || null,
        consent_approved: true,
        status: 'pending_review',
      });
      if (insErr) throw insErr;

      setProgress(100);
      await refreshRecent();
      return true;
    } catch (e: any) {
      setError(e?.message || 'Upload failed.');
      return false;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  }, [refreshRecent]);

  return { submit, uploading, progress, error, recent, refreshRecent };
};
