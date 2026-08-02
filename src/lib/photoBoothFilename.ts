// Customer-friendly download naming for DIGITAL PHOTO BOOTH FILES.
//
// Format: 00001-Event-Name-Photo-Booth.extension
//         (e.g. 00001-Jason-and-Lindas-Wedding-Photo-Booth.jpg)
//
// One combined per-event sequence covers BOTH individual booth captures and
// photo strips (source_category = 'photo_booth'). It is independent from shared
// photos, shared videos and Guestbook content. Storage objects are never
// renamed — the friendly name is applied at download time only, so the original
// file, dimensions, quality, template, branding and metadata are untouched.
import { categoryOf, type ClassifiableItem } from '@/lib/mediaPrivacy';
import { safeEventName } from '@/lib/sharedPhotoFilename';

export interface NameableBoothMedia extends ClassifiableItem {
  kind?: string;
  mime_type?: string;
  storage_path?: string;
  photo_booth_seq?: number | null;
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
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** True when the item was created through the Digital Photo Booth. */
export function isPhotoBoothMedia(item: NameableBoothMedia): boolean {
  return categoryOf(item) === 'photo_booth';
}

/** Original extension, preserved from the stored object (falls back to MIME type). */
export function photoBoothExtension(item: NameableBoothMedia): string {
  const fromPath = (item.storage_path?.split('?')[0].split('.').pop() || '').toLowerCase();
  if (fromPath && /^[a-z0-9]{2,5}$/.test(fromPath)) return fromPath;
  return EXT_BY_MIME[(item.mime_type || '').toLowerCase()] || (item.kind === 'video' ? 'mp4' : 'jpg');
}

/**
 * Returns the customer-friendly filename for a Digital Photo Booth file, or
 * null when out of scope (shared uploads, Guestbook content) or not yet numbered.
 */
export function photoBoothFilename(
  item: NameableBoothMedia,
  eventName: string | null | undefined,
): string | null {
  if (!isPhotoBoothMedia(item)) return null;
  const seq = item.photo_booth_seq;
  if (typeof seq !== 'number' || !Number.isFinite(seq) || seq < 1) return null;
  const safe = safeEventName(eventName);
  if (!safe) return null;
  return `${String(Math.floor(seq)).padStart(5, '0')}-${safe}-Photo-Booth.${photoBoothExtension(item)}`;
}
