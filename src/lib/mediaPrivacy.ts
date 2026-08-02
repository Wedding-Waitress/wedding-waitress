// Strict privacy separation between PUBLIC gallery media and PRIVATE guestbook content.
//
// Classification is driven by the persisted `source_category` column
// ('guest_upload' | 'photo_booth' | 'guestbook_recording'), never by MIME type or `kind`:
// a Guestbook video recording is private even though its file type is video.
//
// Guestbook text messages live in `public.event_guestbook_messages`
// and are classified as 'guestbook_text'.

export type MediaSourceCategory =
  | 'guest_upload'
  | 'photo_booth'
  | 'guestbook_recording'
  | 'guestbook_text';

/** Categories allowed in the guest-facing gallery, Live Slideshow and gallery ZIPs. */
export const PUBLIC_GALLERY_CATEGORIES: MediaSourceCategory[] = ['guest_upload', 'photo_booth'];

/** Categories that must never leave the organiser's private Guestbook workspaces. */
export const PRIVATE_GUESTBOOK_CATEGORIES: MediaSourceCategory[] = [
  'guestbook_recording',
  'guestbook_text',
];

export interface ClassifiableItem {
  source_category?: string | null;
  /** Legacy flags — used only as a fallback for rows loaded before the migration. */
  is_guestbook?: boolean | null;
  is_photo_booth?: boolean | null;
  kind?: string;
  moderation_status?: string;
  signed_url?: string;
}

/** Resolve the authoritative category for a media row. */
export function categoryOf(item: ClassifiableItem): MediaSourceCategory {
  const raw = (item.source_category || '').trim();
  if (
    raw === 'guest_upload' ||
    raw === 'photo_booth' ||
    raw === 'guestbook_recording' ||
    raw === 'guestbook_text'
  ) {
    return raw;
  }
  if (item.is_guestbook) return 'guestbook_recording';
  if (item.is_photo_booth) return 'photo_booth';
  return 'guest_upload';
}

/** True for private Guestbook content (text messages and audio/video recordings). */
export function isPrivateGuestbook(item: ClassifiableItem): boolean {
  return PRIVATE_GUESTBOOK_CATEGORIES.includes(categoryOf(item));
}

/** True for content that belongs to the public gallery surface (regardless of moderation). */
export function isPublicGalleryMedia(item: ClassifiableItem): boolean {
  const cat = categoryOf(item);
  if (!PUBLIC_GALLERY_CATEGORIES.includes(cat)) return false;
  // Audio can only ever be a guestbook recording; never publish it.
  return item.kind !== 'audio';
}

/** Keep only public gallery media (host media library, ZIPs, counts). */
export function publicGalleryItems<T extends ClassifiableItem>(items: T[]): T[] {
  return items.filter(isPublicGalleryMedia);
}

/** Keep only items that may be shown to guests / the Live Slideshow. */
export function guestVisibleItems<T extends ClassifiableItem>(items: T[]): T[] {
  return items.filter(
    (i) => isPublicGalleryMedia(i) && (i.moderation_status ?? 'approved') === 'approved',
  );
}

/** Keep only private Guestbook recordings (audio + video), for the Voice workspace. */
export function guestbookRecordings<T extends ClassifiableItem>(items: T[]): T[] {
  return items.filter((i) => categoryOf(i) === 'guestbook_recording');
}
