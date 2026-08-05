import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquareText, LoaderCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

interface Row {
  id: string;
  name: string | null;
  message: string;
  at: string | null;
  source: 'text' | 'recording';
}

export const GuestbookMessagesList: React.FC<{ eventId: string | null; items: GalleryItem[] }> = ({ eventId, items }) => {
  const [textRows, setTextRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) { setTextRows([]); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('event_guestbook_messages')
      .select('id, uploader_name, message, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    setTextRows(((data || []) as any[]).map(r => ({
      id: r.id, name: r.uploader_name, message: r.message, at: r.created_at, source: 'text' as const,
    })));
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const recordingRows: Row[] = items
    .filter(i => i.guestbook_message && i.guestbook_message.trim().length > 0)
    .map(i => ({ id: i.id, name: i.uploader_name, message: i.guestbook_message as string, at: i.uploaded_at, source: 'recording' as const }));

  const rows = [...textRows, ...recordingRows].sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  if (!loading && rows.length === 0) return null;

  return (
    <Card className="p-4 sm:p-5 overflow-hidden">
      <h2 className="text-xl font-bold text-black mb-4 flex items-start gap-2" style={{ color: '#000000' }}>
        <MessageSquareText className="h-5 w-5 text-[#967A59] shrink-0 mt-0.5" strokeWidth={1.8} /> <span className="min-w-0 break-words">Guestbook messages ({rows.length})</span>
      </h2>

      {loading ? (
        <div className="py-6 flex justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-[#967A59]" strokeWidth={1.8} /></div>
      ) : (
        <ul className="space-y-3">
          {rows.map(m => (
            <li key={`${m.source}-${m.id}`} className="border border-border rounded-lg p-3 bg-[#FBF8F3]">
              <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap break-words">{m.message}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                — {m.name || 'Anonymous guest'}
                {m.at && ` • ${new Date(m.at).toLocaleDateString()}`}
                {m.source === 'recording' && ' • note with recording'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default GuestbookMessagesList;
