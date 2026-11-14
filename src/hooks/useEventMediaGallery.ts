// Host-side gallery hook
import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deleteEventMediaItems } from '@/lib/deleteEventMedia';
import type { SlideshowSettings } from '@/lib/slideshowSettings';
import type { PersistedPhotoBoothStripStyle } from '@/lib/photoBoothTemplate';
import { getCacheGeneration, registerCache, registerEventCache } from '@/lib/cacheRegistry';
import { createCoalescedRead } from '@/lib/coalescedRead';

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
  gallery_title: string | null;
  welcome_message: string | null;
  show_event_date: boolean;
  slideshow_photo_duration_sec: number;
  password_enabled: boolean;
  has_password: boolean;
  theme_color: string | null;
  background_style: 'light' | 'dark' | 'cream';
  cover_image_url: string | null;
  logo_image_url: string | null;
  show_branding: boolean;
  background_mode: 'preset' | 'color' | 'image';
  background_color: string | null;
  background_image_url: string | null;
  /** Voice Guestbook (recordings) — stored in DB as video_guestbook_enabled. */
  voice_guestbook_enabled: boolean;
  photo_booth_enabled: boolean;
  photo_booth_mode: 'single' | 'strip';
  photo_booth_single_bottom_text: string | null;
  photo_booth_single_logo_url: string | null;
  photo_booth_single_template_url: string | null;
  photo_booth_strip_bottom_text: string | null;
  photo_booth_strip_logo_url: string | null;
  photo_booth_strip_template_url: string | null;
  photo_booth_strip_style: PersistedPhotoBoothStripStyle | null;
  slideshow_enabled: boolean;
  guest_upload_enabled: boolean;
  gallery_view_enabled: boolean;
  guestbook_text_enabled: boolean;
  /** Live Slideshow settings (per event). */
  slideshow_include_photos: boolean;
  slideshow_include_videos: boolean;
  slideshow_albums: string[];
  slideshow_order: 'newest' | 'oldest' | 'shuffle';
  slideshow_slide_duration_sec: number;
  slideshow_transition: 'fade' | 'slide' | 'none';
  slideshow_show_caption: boolean;
  slideshow_loop: boolean;
}

export interface PhotoBoothTemplateSettings {
  bottom_text: string | null;
  logo_url: string | null;
  template_url: string | null;
  style?: PersistedPhotoBoothStripStyle | null;
}

export interface GalleryDisplaySettings {
  gallery_title: string | null;
  welcome_message: string | null;
  show_event_date: boolean;
  slideshow_photo_duration_sec: number;
}

export interface GalleryBrandingSettings {
  theme_color: string | null;
  background_style: 'light' | 'dark' | 'cream';
  cover_image_url: string | null;
  logo_image_url: string | null;
  show_branding: boolean;
  background_mode: 'preset' | 'color' | 'image';
  background_color: string | null;
  background_image_url: string | null;
}

export type GalleryAlbum = 'Ceremony' | 'Reception' | 'Dance Floor' | 'Speeches' | 'Bridal Party' | 'Other';

export const GALLERY_ALBUMS: GalleryAlbum[] = [
  'Ceremony',
  'Reception',
  'Dance Floor',
  'Speeches',
  'Bridal Party',
  'Other',
];

export interface GalleryItem {
  id: string;
  kind: 'photo' | 'video' | 'audio';
  mime_type: string;
  byte_size: number;
  duration_sec: number | null;
  storage_path: string;
  uploader_name: string | null;
  caption: string | null;
  guestbook_message: string | null;
  uploaded_at: string | null;
  moderation_status: 'approved' | 'hidden';
  album: GalleryAlbum | null;
  is_guestbook: boolean;
  is_photo_booth: boolean;
  is_photo_booth_strip: boolean;
  /** Authoritative privacy classification (see src/lib/mediaPrivacy.ts). */
  source_category?: 'guest_upload' | 'photo_booth' | 'guestbook_recording' | 'guestbook_text' | 'video_wishes';
  shared_to_slideshow?: boolean;
  /** Permanent per-event shared-photo number (guest_upload photos only). */
  share_photo_seq?: number | null;
  /** Permanent per-event shared-video number (guest_upload videos only). */
  share_video_seq?: number | null;
  /** Permanent per-event Audio Guestbook recording number (private recordings only). */
  guestbook_recording_seq?: number | null;
  /** Permanent per-event Digital Photo Booth number (booth captures + strips). */
  photo_booth_seq?: number | null;
  like_count?: number;
  /** Organiser deliberately published this private guestbook recording to the gallery. */
  shared_to_gallery?: boolean;
  signed_url?: string;
}


// Module-level cache: event IDs known to have a gallery row in this session.
// Lets us skip the ensure_event_media_gallery probe on warm re-selects.
const ensuredGalleries = new Set<string>();
const galleryMetaCache = new Map<string, GalleryMeta>();
const galleryItemsCache = new Map<string, GalleryItem[]>();
registerCache(() => {
  ensuredGalleries.clear();
  galleryMetaCache.clear();
  galleryItemsCache.clear();
});
registerEventCache((eventId) => {
  ensuredGalleries.delete(eventId);
  galleryMetaCache.delete(eventId);
  galleryItemsCache.delete(eventId);
});

export function useEventMediaGallery(eventId: string | null, options: { loadItems?: boolean } = {}) {
  const itemReads = useRef(createCoalescedRead<void>());
  const currentEvent = useRef(eventId); currentEvent.current = eventId;
  const shouldLoadItems = options.loadItems !== false;
  const [metaState, setMetaState] = useState(() => ({ eventId, value: eventId ? galleryMetaCache.get(eventId) ?? null : null }));
  const meta = metaState.eventId === eventId ? metaState.value : null;
  const [itemsState, setItemsState] = useState(() => ({ eventId, value: eventId ? galleryItemsCache.get(eventId) ?? [] : [] as GalleryItem[] }));
  const items = itemsState.eventId === eventId ? itemsState.value : [];
  const [loading, setLoading] = useState(() => Boolean(eventId && !galleryMetaCache.has(eventId)));
  const [error, setError] = useState<string | null>(null);

  const setMeta = useCallback((update: SetStateAction<GalleryMeta | null>) => {
    if (currentEvent.current !== eventId) return;
    setMetaState((state) => {
      if (currentEvent.current !== eventId) return state;
      const previous = state.eventId === eventId ? state.value : null;
      const next = typeof update === 'function'
        ? (update as (value: GalleryMeta | null) => GalleryMeta | null)(previous)
        : update;
      if (eventId && next) galleryMetaCache.set(eventId, next);
      return { eventId, value: next };
    });
  }, [eventId]);

  const setItems = useCallback((update: SetStateAction<GalleryItem[]>) => {
    if (currentEvent.current !== eventId) return;
    setItemsState((state) => {
      if (currentEvent.current !== eventId) return state;
      const previous = state.eventId === eventId ? state.value : [];
      const next = typeof update === 'function'
        ? (update as (value: GalleryItem[]) => GalleryItem[])(previous)
        : update;
      if (eventId) galleryItemsCache.set(eventId, next);
      return { eventId, value: next };
    });
  }, [eventId]);

  const ensureGallery = useCallback(async (eid: string) => {
    const { error: err } = await (supabase as any).rpc('ensure_event_media_gallery', { _event_id: eid });
    if (err) throw new Error(err.message || 'Failed to initialise gallery');
    ensuredGalleries.add(eid);
  }, []);

  const fetchMeta = useCallback(async (eid: string): Promise<GalleryMeta | null> => {
    const { data, error: err } = await (supabase as any).rpc('get_event_media_gallery_host', { _event_id: eid });
    if (err) throw new Error(err.message || 'Failed to load gallery');
    const row: any = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    // DB column is still named video_guestbook_enabled; surfaced as Voice Guestbook in the UI.
    return { ...row, voice_guestbook_enabled: !!row.video_guestbook_enabled } as GalleryMeta;
  }, []);

  const loadMeta = useCallback(async (eid: string) => {
    const generation = getCacheGeneration();
    const row = await fetchMeta(eid);
    if (currentEvent.current !== eid || generation !== getCacheGeneration()) return;
    if (!row) throw new Error('Gallery not found for this event');
    setMeta(row);
  }, [fetchMeta, setMeta]);

  const loadItems = useCallback(async (eid: string, invalidate = false) => {
    const generation = getCacheGeneration();
    const current = () => currentEvent.current === eid && generation === getCacheGeneration();
    return itemReads.current(`${generation}:${eid}`, async () => {
    if (!current()) return;
    const { data, error: err } = await (supabase as any).rpc('get_event_media_items_host', { _event_id: eid });
    if (err) throw new Error(err.message || 'Failed to load gallery items');
    const rows = (data || []) as GalleryItem[];
    if (!current()) return;
    const {data:wishes,error:wishError}=rows.some(row => row.source_category==='video_wishes')
      ? await (supabase as any).from('event_media_items').select('id,shared_to_slideshow').eq('event_id',eid).eq('source_category','video_wishes')
      : { data: [], error: null };
    if(wishError)throw wishError;
    const wishMap=new Map((wishes||[]).map((wish:any)=>[wish.id,wish.shared_to_slideshow]));
    for(const row of rows)if(row.source_category==='video_wishes')row.shared_to_slideshow=wishMap.get(row.id)===true;
    if (rows.length === 0) { if (current()) setItems([]); return; }

    // Option A: sign URLs client-side using the authenticated Storage API.
    // Try batch first, fall back to per-item createSignedUrl.
    const paths = rows.map(r => r.storage_path);
    const map = new Map<string, string>();
      const { data: signed, error: signError } = await supabase.storage.from('event-media').createSignedUrls(paths, 3600);
      // A batch timeout/permission failure must not fan out into N more requests
      // against the same struggling Storage API. Refresh can retry the batch.
      if (signError) throw new Error(signError.message || 'Failed to sign gallery media');
      (signed || []).forEach((s: any, i: number) => {
        if (s?.signedUrl) map.set(rows[i].id, s.signedUrl);
      });
    for (const r of rows) {
      if (!map.get(r.id)) {
        const { data: s } = await supabase.storage.from('event-media').createSignedUrl(r.storage_path, 3600);
        if (s?.signedUrl) map.set(r.id, s.signedUrl);
      }
    }
    if (current()) setItems(rows.map(r => ({ ...r, signed_url: map.get(r.id) })));
    }, invalidate);
  }, [setItems]);

  const loadRequestedItems = useCallback(async (eid: string) => {
    if (shouldLoadItems) await loadItems(eid);
  }, [loadItems, shouldLoadItems]);

  const refreshRecordings = useCallback(async () => {
    if (eventId) await loadItems(eventId, true);
  }, [eventId, loadItems]);

  const refresh = useCallback(async () => {
    const eid = eventId;
    const generation = getCacheGeneration();
    const current = () => currentEvent.current === eid && generation === getCacheGeneration();
    if (!eid || !current()) return;
    setLoading(!galleryMetaCache.has(eid) || (shouldLoadItems && !galleryItemsCache.has(eid)));
    setError(null);
    try {
      const [existing] = await Promise.all([fetchMeta(eid), loadRequestedItems(eid)]);
      if (!current()) return;
      let row = existing;
      if (!row) {
        ensuredGalleries.delete(eid);
        await ensureGallery(eid);
        if (!current()) return;
        row = await fetchMeta(eid);
        if (!current()) return;
      }
      if (!row) throw new Error('Gallery not found for this event');
      setMeta(row);
      ensuredGalleries.add(eid);
    } catch (e: any) {
      if (current()) setError(e?.message || 'Failed to load gallery');
    } finally {
      if (current()) setLoading(false);
    }
  }, [eventId, ensureGallery, fetchMeta, loadRequestedItems, setMeta, shouldLoadItems]);

  useEffect(() => {
    if (!eventId) { setMeta(null); setItems([]); setError(null); return; }
    setMeta(galleryMetaCache.get(eventId) ?? null);
    setItems(galleryItemsCache.get(eventId) ?? []);
    refresh();
    if (!shouldLoadItems) return;
    const channel = supabase
      .channel(`event-media:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_media_items', filter: `event_id=eq.${eventId}` },
        () => { loadItems(eventId, true).catch(() => {}); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, refresh, loadItems, setItems, setMeta, shouldLoadItems]);

  const setOpen = useCallback(async (open: boolean) => {
    if (!eventId) return;
    const { error: err } = await (supabase as any).rpc('set_event_media_gallery_open', { _event_id: eventId, _is_open: open });
    if (err) throw new Error(err.message || 'Failed to update gallery availability');
    setMeta(m => m ? { ...m, is_open: open } : m);
  }, [eventId, setMeta]);

  /**
   * Authoritative deletion for gallery media (single + bulk).
   * Cards are only removed from state after the backend confirms the rows are gone.
   */
  const deleteItems = useCallback(async (ids: string[]) => {
    const result = await deleteEventMediaItems(ids);
    if (result.deletedIds.length > 0) {
      const gone = new Set(result.deletedIds);
      setItems(prev => prev.filter(i => !gone.has(i.id)));
      // Refetch so counts, usage, ZIP totals and filters all reflect the backend.
      if (eventId) loadItems(eventId).catch(() => {});
    }
    return result;
  }, [eventId, loadItems]);

  const deleteItem = useCallback(async (id: string) => {
    await deleteItems([id]);
  }, [deleteItems]);

  const setModeration = useCallback(async (id: string, status: 'approved' | 'hidden') => {
    const { error: err } = await (supabase as any).rpc('set_event_media_moderation', { _item_id: id, _status: status });
    if (err) throw new Error(err.message || 'Failed to update moderation');
    setItems(prev => prev.map(i => i.id === id ? { ...i, moderation_status: status } : i));
  }, [setItems]);

  const updateLimits = useCallback(async (l: Partial<GalleryMeta>) => {
    if (!eventId) return;
    const { error: err } = await (supabase as any).rpc('update_event_media_limits', {
      _event_id: eventId,
      _max_photos: l.max_photos ?? null,
      _max_videos: l.max_videos ?? null,
      _max_total_bytes: l.max_total_bytes ?? null,
      _max_video_bytes: l.max_video_bytes ?? null,
      _max_video_duration_sec: l.max_video_duration_sec ?? null,
      _max_photo_bytes: l.max_photo_bytes ?? null,
    });
    if (err) throw new Error(err.message || 'Failed to update limits');
    await loadMeta(eventId);
  }, [eventId, loadMeta]);

  const updateDisplaySettings = useCallback(async (s: GalleryDisplaySettings) => {
    if (!eventId) return;
    // Optimistic
    setMeta(m => m ? { ...m, ...s } : m);
    const { error: err } = await (supabase as any).rpc('update_event_media_display_settings', {
      _event_id: eventId,
      _gallery_title: s.gallery_title,
      _welcome_message: s.welcome_message,
      _show_event_date: s.show_event_date,
      _slideshow_photo_duration_sec: s.slideshow_photo_duration_sec,
    });
    if (err) {
      // Revert by reloading meta
      await loadMeta(eventId).catch(() => {});
      throw new Error(err.message || 'Failed to save display settings');
    }
  }, [eventId, loadMeta]);

  const setPassword = useCallback(async ({ enabled, password }: { enabled: boolean; password: string | null }) => {
    if (!eventId) return;
    const { error: err } = await (supabase as any).rpc('set_event_media_password', {
      _event_id: eventId,
      _enabled: enabled,
      _password: password,
    });
    if (err) throw new Error(err.message || 'Failed to save password');
    await loadMeta(eventId).catch(() => {});
  }, [eventId, loadMeta]);

  const updateBranding = useCallback(async (b: GalleryBrandingSettings) => {
    if (!eventId) return;
    setMeta(m => m ? { ...m, ...b } : m);
    const { error: err } = await (supabase as any).rpc('update_event_media_branding', {
      _event_id: eventId,
      _theme_color: b.theme_color,
      _background_style: b.background_style,
      _cover_image_url: b.cover_image_url,
      _logo_image_url: b.logo_image_url,
      _show_branding: b.show_branding,
      _background_mode: b.background_mode,
      _background_color: b.background_color,
      _background_image_url: b.background_image_url,
    });
    if (err) {
      await loadMeta(eventId).catch(() => {});
      throw new Error(err.message || 'Failed to save branding');
    }
  }, [eventId, loadMeta]);

  const setAlbum = useCallback(async (id: string, album: GalleryAlbum | null) => {
    const prev = items.find(i => i.id === id)?.album ?? null;
    setItems(curr => curr.map(i => (i.id === id ? { ...i, album } : i)));
    const { error: err } = await (supabase as any).rpc('set_event_media_album', { _item_id: id, _album: album });
    if (err) {
      setItems(curr => curr.map(i => (i.id === id ? { ...i, album: prev } : i)));
      throw new Error(err.message || 'Failed to update album');
    }
  }, [items, setItems]);

  const bulkSetAlbum = useCallback(async (ids: string[], album: GalleryAlbum | null) => {
    if (ids.length === 0) return 0;
    const prevMap = new Map(items.filter(i => ids.includes(i.id)).map(i => [i.id, i.album]));
    setItems(curr => curr.map(i => (ids.includes(i.id) ? { ...i, album } : i)));
    const { data, error: err } = await (supabase as any).rpc('set_event_media_albums', { _item_ids: ids, _album: album });
    if (err) {
      setItems(curr => curr.map(i => (prevMap.has(i.id) ? { ...i, album: prevMap.get(i.id) ?? null } : i)));
      throw new Error(err.message || 'Failed to update albums');
    }
    return (data as number) ?? ids.length;
  }, [items, setItems]);

  const setVoiceGuestbookEnabled = useCallback(async (enabled: boolean) => {
    if (!eventId) return;
    setMeta(m => m ? { ...m, voice_guestbook_enabled: enabled } : m);
    const { error: err } = await (supabase as any).rpc('set_event_media_video_guestbook', { _event_id: eventId, _enabled: enabled });
    if (err) {
      setMeta(m => m ? { ...m, voice_guestbook_enabled: !enabled } : m);
      throw new Error(err.message || 'Failed to update Voice Guestbook');
    }
  }, [eventId, setMeta]);

  /** Unified Digital Guestbook toggle — controls written, audio and video messages together. */
  const setGuestbookEnabled = useCallback(async (enabled: boolean) => {
    if (!eventId) return;
    const previous = meta;
    setMeta(m => m ? { ...m, voice_guestbook_enabled: enabled, guestbook_text_enabled: enabled } : m);
    try {
      const {error} = await (supabase as any).rpc('set_event_media_digital_guestbook', { _event_id: eventId, _enabled: enabled });
      if (error) throw new Error(error.message || 'Failed to update Digital Guestbook');
    } catch (error) {
      setMeta(previous);
      throw error;
    }
  }, [eventId, meta, setMeta]);

  /** Publish / un-publish a private guestbook recording to the public gallery. */



  const setSlideshowEnabled = useCallback(async (enabled: boolean) => {
    if (!eventId) return;
    setMeta(m => m ? { ...m, slideshow_enabled: enabled } : m);
    const { error: err } = await (supabase as any).rpc('set_event_media_slideshow', { _event_id: eventId, _enabled: enabled });
    if (err) {
      setMeta(m => m ? { ...m, slideshow_enabled: !enabled } : m);
      throw new Error(err.message || 'Failed to update Live Slideshow');
    }
  }, [eventId, setMeta]);

  const setPhotoBoothEnabled = useCallback(async (enabled: boolean) => {
    if (!eventId) return;
    setMeta(m => m ? { ...m, photo_booth_enabled: enabled } : m);
    const { error: err } = await (supabase as any).rpc('set_event_media_photo_booth', { _event_id: eventId, _enabled: enabled });
    if (err) {
      setMeta(m => m ? { ...m, photo_booth_enabled: !enabled } : m);
      throw new Error(err.message || 'Failed to update Photo Booth');
    }
  }, [eventId, setMeta]);

  const setPhotoBoothMode = useCallback(async (mode: 'single' | 'strip') => {
    if (!eventId) return;
    const prev = meta?.photo_booth_mode ?? 'single';
    setMeta(m => m ? { ...m, photo_booth_mode: mode } : m);
    const { error: err } = await (supabase as any).rpc('set_event_media_photo_booth_mode', { _event_id: eventId, _mode: mode });
    if (err) {
      setMeta(m => m ? { ...m, photo_booth_mode: prev } : m);
      throw new Error(err.message || 'Failed to update Photo Booth mode');
    }
  }, [eventId, meta?.photo_booth_mode]);

  const updatePhotoBoothTemplate = useCallback(async (kind: 'single' | 'strip', s: PhotoBoothTemplateSettings) => {
    if (!eventId) return;
    const { error: err } = await (supabase as any).rpc('update_event_media_photo_booth_template', {
      _event_id: eventId,
      _kind: kind,
      _bottom_text: s.bottom_text,
      _logo_url: s.logo_url,
      _template_url: s.template_url,
      _style: s.style ?? {},
    });
    if (err) throw new Error(err.message || 'Failed to save Photo Booth template');
    setMeta(m => {
      if (!m) return m;
      if (kind === 'single') return {
        ...m,
        photo_booth_single_bottom_text: s.bottom_text,
        photo_booth_single_logo_url: s.logo_url,
        photo_booth_single_template_url: s.template_url,
      };
      return {
        ...m,
        photo_booth_strip_bottom_text: s.bottom_text,
        photo_booth_strip_logo_url: s.logo_url,
        photo_booth_strip_template_url: s.template_url,
        photo_booth_strip_style: s.style ?? null,
      };
    });
    // Re-read the persisted row so the next feature route and subsequent save
    // use the same canonical template identity returned by the database.
    try {
      const persisted = await fetchMeta(eventId);
      if (persisted) setMeta(persisted);
    } catch (error) {
      console.warn('[Photo Booth] Template saved, but refreshing the persisted settings failed.', error);
    }
  }, [eventId, fetchMeta, setMeta]);

  const setGuestFeature = useCallback(async (
    feature: 'guest_upload_enabled' | 'gallery_view_enabled' | 'guestbook_text_enabled',
    enabled: boolean,
  ) => {
    if (!eventId) return;
    setMeta(m => m ? { ...m, [feature]: enabled } : m);
    const { error: err } = await (supabase as any).rpc('set_event_media_guest_feature', {
      _event_id: eventId, _feature: feature, _enabled: enabled,
    });
    if (err) {
      setMeta(m => m ? { ...m, [feature]: !enabled } : m);
      throw new Error(err.message || 'Failed to update feature');
    }
  }, [eventId, setMeta]);

  const updateSlideshowSettings = useCallback(async (s: SlideshowSettings) => {
    if (!eventId) return;
    const prev = meta;
    setMeta(m => m ? {
      ...m,
      slideshow_include_photos: s.include_photos,
      slideshow_include_videos: s.include_videos,
      slideshow_albums: s.albums,
      slideshow_order: s.order,
      slideshow_slide_duration_sec: s.slide_duration_sec,
      slideshow_transition: s.transition,
      slideshow_show_caption: s.show_caption,
      slideshow_loop: s.loop,
    } : m);
    const { error: err } = await (supabase as any).rpc('update_event_media_slideshow_settings', {
      _event_id: eventId,
      _include_photos: s.include_photos,
      _include_videos: s.include_videos,
      _albums: s.albums,
      _order: s.order,
      _slide_duration_sec: s.slide_duration_sec,
      _transition: s.transition,
      _show_caption: s.show_caption,
      _loop: s.loop,
    });
    if (err) {
      setMeta(prev);
      throw new Error(err.message || 'Failed to save slideshow settings');
    }
  }, [eventId, meta]);

  return { meta, items, loading, error, refresh, refreshRecordings, setOpen, deleteItem, deleteItems, updateLimits, setModeration, updateDisplaySettings, setPassword, updateBranding, setAlbum, bulkSetAlbum, setVoiceGuestbookEnabled, setGuestbookEnabled, setPhotoBoothEnabled, setPhotoBoothMode, updatePhotoBoothTemplate, setSlideshowEnabled, setGuestFeature, updateSlideshowSettings };
}
