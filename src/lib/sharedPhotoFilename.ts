// Customer-friendly download naming for SHARED PHOTOS ONLY.
//
// Format: 00001-Event-Name.extension  (e.g. 00001-Jason-and-Lindas-Wedding.jpg)
//
// Applies only to photos uploaded through Photo & Video Sharing
// (source_category = 'guest_upload', kind = 'photo'). Videos, Digital Photo Booth
// captures and private Guestbook content keep their existing names.
//
// The five-digit number comes from the permanent per-event `share_photo_seq`
// column; storage objects are never renamed.
import { categoryOf, type ClassifiableItem } from '@/lib/mediaPrivacy';

export interface NameableMedia extends ClassifiableItem {
  id: string;
  kind?: string;
  mime_type?: string;
  storage_path?: string;
  share_photo_seq?: number | null;
}

/** Convert an event name into a safe filename fragment. */
export function safeEventName(name: string | null | undefined): string {
  const cleaned = (name || '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^A-Za-z0-9\- ]+/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
};

/** Original extension, preserved from the stored object (falls back to MIME type). */
export function photoExtension(item: NameableMedia): string {
  const fromPath = (item.storage_path?.split('?')[0].split('.').pop() || '').toLowerCase();
  if (fromPath && /^[a-z0-9]{2,5}$/.test(fromPath)) return fromPath;
  return EXT_BY_MIME[(item.mime_type || '').toLowerCase()] || 'jpg';
}

/** True when this item is a shared photo eligible for the numbered naming scheme. */
export function isSharedPhoto(item: NameableMedia): boolean {
  return item.kind === 'photo' && categoryOf(item) === 'guest_upload';
}

/**
 * Returns the customer-friendly filename for a shared photo, or null when the
 * item is out of scope (video, photo booth, guestbook) or has no sequence yet.
 */
export function sharedPhotoFilename(
  item: NameableMedia,
  eventName: string | null | undefined,
): string | null {
  if (!isSharedPhoto(item)) return null;
  const seq = item.share_photo_seq;
  if (typeof seq !== 'number' || !Number.isFinite(seq) || seq < 1) return null;
  const safe = safeEventName(eventName);
  if (!safe) return null;
  return `${String(Math.floor(seq)).padStart(5, '0')}-${safe}.${photoExtension(item)}`;
}
