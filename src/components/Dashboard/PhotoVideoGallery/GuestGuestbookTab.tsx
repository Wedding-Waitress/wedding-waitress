// Guest-facing guestbook tab — shown on /gallery/:token?tab=guestbook
// Read-only list of written messages left by guests (approved items only).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, AlertCircle, Quote } from 'lucide-react';
import type { GalleryTheme } from '@/lib/galleryTheme';

interface GuestbookRow {
  id: string;
  uploader_name: string | null;
  guestbook_message: string | null;
  uploaded_at: string | null;
}

interface Props {
  token: string;
  theme: GalleryTheme;
  accent: string;
  /** Bumped by the parent after a successful upload to force an immediate refresh. */
  refreshKey?: number;
}

export const GuestGuestbookTab: React.FC<Props> = ({ token, theme, accent, refreshKey = 0 }) => {
  const [rows, setRows] = useState<GuestbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await (supabase as any)
        .rpc('get_event_media_guestbook_public', { _token: token });
      if (err) throw new Error(err.message);
      if (!mounted.current) return;
      setRows((data || []) as GuestbookRow[]);
      setError(null);
    } catch (e: any) {
      if (mounted.current) setError(e?.message || 'Could not load the guestbook');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border p-6 text-center ${theme.surfaceClass}`}>
        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
        <p className={`text-sm ${theme.mutedClass}`}>{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`rounded-2xl border p-10 text-center ${theme.surfaceClass}`}>
        <MessageCircle className="h-9 w-9 mx-auto mb-3" style={{ color: accent }} />
        <p className={`text-base font-medium ${theme.textClass}`}>No messages yet</p>
        <p className={`text-sm mt-1.5 ${theme.mutedClass}`}>
          Be the first to leave a note for the couple from the Upload tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className={`text-center text-sm ${theme.mutedClass}`}>
        {rows.length} {rows.length === 1 ? 'message' : 'messages'} for the couple
      </p>
      <ul className="space-y-4">
        {rows.map(r => (
          <li
            key={r.id}
            className={`relative rounded-2xl border p-5 sm:p-6 ${theme.surfaceClass} shadow-[0_4px_20px_rgba(0,0,0,0.04)]`}
          >
            <Quote className="h-5 w-5 mb-3 opacity-70" style={{ color: accent }} />
            <p className={`text-base leading-relaxed whitespace-pre-wrap ${theme.textClass}`}>
              {r.guestbook_message}
            </p>
            <p className={`mt-4 text-sm ${theme.mutedClass}`}>
              — {r.uploader_name?.trim() || 'A guest'}
              {r.uploaded_at && ` • ${new Date(r.uploaded_at).toLocaleDateString()}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GuestGuestbookTab;
