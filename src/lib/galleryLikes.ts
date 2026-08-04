// Anonymous guest reactions (hearts) for the Photo & Video Sharing.
// A per-device id stored in localStorage prevents double-liking from the same device.
import { supabase } from '@/integrations/supabase/client';

const DEVICE_KEY = 'ww_gallery_device_id';

export function getGalleryDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export async function fetchLikedItemIds(token: string): Promise<Set<string>> {
  const { data, error } = await (supabase as any).rpc('get_event_media_likes_for_device', {
    _token: token,
    _device_id: getGalleryDeviceId(),
  });
  if (error) return new Set();
  return new Set(((data || []) as Array<{ item_id: string }>).map(r => r.item_id));
}

export async function toggleGalleryLike(
  token: string,
  itemId: string,
): Promise<{ liked: boolean; like_count: number }> {
  const { data, error } = await (supabase as any).rpc('toggle_event_media_like', {
    _token: token,
    _item_id: itemId,
    _device_id: getGalleryDeviceId(),
  });
  if (error) throw new Error(error.message || 'Could not save your reaction');
  const row = Array.isArray(data) ? data[0] : data;
  return { liked: !!row?.liked, like_count: Number(row?.like_count ?? 0) };
}
