// Host-side gallery hook
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GalleryMeta {
  gallery_id: string;
  is_open: boolean;
  primary_token: string | null;
  max_photos: number;
  max_videos: number;
  max_total_bytes: number;
  max_video_bytes: number;
  max_video_duration_sec: number;
  max_photo_bytes: number;
}

export interface GalleryItem {
  id: string;
  kind: 'photo' | 'video';
  mime_type: string;
  byte_size: number;
  duration_sec: number | null;
  storage_path: string;
  uploader_name: string | null;
  caption: string | null;
  guestbook_message: string | null;
  uploaded_at: string | null;
  moderation_status: 'approved' | 'hidden';
  signed_url?: string;
}


// Module-level cache: event IDs known to have a gallery row in this session.
// Lets us skip the ensure_event_media_gallery probe on warm re-selects.
const ensuredGalleries = new Set<string>();

export function useEventMediaGallery(eventId: string | null) {
  const [meta, setMeta] = useState<GalleryMeta | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureGallery = useCallback(async (eid: string) => {
    const { error: err } = await (supabase as any).rpc('ensure_event_media_gallery', { _event_id: eid });
    if (err) throw new Error(err.message || 'Failed to initialise gallery');
    ensuredGalleries.add(eid);
  }, []);

  const fetchMeta = useCallback(async (eid: string): Promise<GalleryMeta | null> => {
    const { data, error: err } = await (supabase as any).rpc('get_event_media_gallery_host', { _event_id: eid });
    if (err) throw new Error(err.message || 'Failed to load gallery');
    const row = Array.isArray(data) ? data[0] : data;
    return (row as GalleryMeta) || null;
  }, []);

  const loadMeta = useCallback(async (eid: string) => {
    const row = await fetchMeta(eid);
    if (!row) throw new Error('Gallery not found for this event');
    setMeta(row);
  }, [fetchMeta]);

  const loadItems = useCallback(async (eid: string) => {
    const { data, error: err } = await (supabase as any).rpc('get_event_media_items_host', { _event_id: eid });
    if (err) throw new Error(err.message || 'Failed to load gallery items');
    const rows = (data || []) as GalleryItem[];
    if (rows.length === 0) { setItems([]); return; }

    // Option A: sign URLs client-side using the authenticated Storage API.
    // Try batch first, fall back to per-item createSignedUrl.
    const paths = rows.map(r => r.storage_path);
    const map = new Map<string, string>();
    try {
      const { data: signed } = await supabase.storage.from('event-media').createSignedUrls(paths, 3600);
      (signed || []).forEach((s: any, i: number) => {
        if (s?.signedUrl) map.set(rows[i].id, s.signedUrl);
      });
    } catch {
      // ignore — per-item fallback below
    }
    for (const r of rows) {
      if (!map.get(r.id)) {
        const { data: s } = await supabase.storage.from('event-media').createSignedUrl(r.storage_path, 3600);
        if (s?.signedUrl) map.set(r.id, s.signedUrl);
      }
    }
    setItems(rows.map(r => ({ ...r, signed_url: map.get(r.id) })));
  }, []);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      if (ensuredGalleries.has(eventId)) {
        // Warm path: gallery known to exist — fetch meta + items in parallel.
        const [metaRow] = await Promise.all([
          fetchMeta(eventId),
          loadItems(eventId),
        ]);
        if (!metaRow) {
          // Row disappeared (unlikely) — fall through to ensure + retry.
          ensuredGalleries.delete(eventId);
          await ensureGallery(eventId);
          const retry = await fetchMeta(eventId);
          if (!retry) throw new Error('Gallery not found for this event');
          setMeta(retry);
        } else {
          setMeta(metaRow);
        }
      } else {
        // Cold path: probe meta first; only call ensure if no row exists.
        // Run the probe + items in parallel to hide latency when the row is already present.
        const [metaRow] = await Promise.all([
          fetchMeta(eventId),
          loadItems(eventId),
        ]);
        if (metaRow) {
          setMeta(metaRow);
          ensuredGalleries.add(eventId);
        } else {
          await ensureGallery(eventId);
          const created = await fetchMeta(eventId);
          if (!created) throw new Error('Gallery not found for this event');
          setMeta(created);
          // items were already loaded (empty) in the parallel call above
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [eventId, ensureGallery, fetchMeta, loadItems]);

  useEffect(() => {
    if (!eventId) { setMeta(null); setItems([]); setError(null); return; }
    refresh();
    const channel = supabase
      .channel(`event-media:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_media_items', filter: `event_id=eq.${eventId}` },
        () => { loadItems(eventId).catch(() => {}); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, refresh, loadItems]);

  const setOpen = useCallback(async (open: boolean) => {
    if (!eventId) return;
    await (supabase as any).rpc('set_event_media_gallery_open', { _event_id: eventId, _is_open: open });
    setMeta(m => m ? { ...m, is_open: open } : m);
  }, [eventId]);

  const deleteItem = useCallback(async (id: string) => {
    await (supabase as any).rpc('delete_event_media_item', { _item_id: id });
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const setModeration = useCallback(async (id: string, status: 'approved' | 'hidden') => {
    // Optimistic update
    setItems(prev => prev.map(i => (i.id === id ? { ...i, moderation_status: status } : i)));
    const { error: err } = await (supabase as any).rpc('set_event_media_moderation', { _item_id: id, _status: status });
    if (err) {
      // Revert
      setItems(prev => prev.map(i => (i.id === id ? { ...i, moderation_status: status === 'approved' ? 'hidden' : 'approved' } : i)));
      throw new Error(err.message || 'Failed to update moderation');
    }
  }, []);


  const updateLimits = useCallback(async (l: Partial<GalleryMeta>) => {
    if (!eventId) return;
    await (supabase as any).rpc('update_event_media_limits', {
      _event_id: eventId,
      _max_photos: l.max_photos ?? null,
      _max_videos: l.max_videos ?? null,
      _max_total_bytes: l.max_total_bytes ?? null,
      _max_video_bytes: l.max_video_bytes ?? null,
      _max_video_duration_sec: l.max_video_duration_sec ?? null,
      _max_photo_bytes: l.max_photo_bytes ?? null,
    });
    await loadMeta(eventId).catch((e: any) => setError(e?.message || 'Failed to reload limits'));
  }, [eventId, loadMeta]);

  return { meta, items, loading, error, refresh, setOpen, deleteItem, updateLimits, setModeration };
}
