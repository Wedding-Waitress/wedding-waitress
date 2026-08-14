// Shared Live Slideshow settings — used by the host workspace preview and the public Live View.
// Only approved, non-hidden, uploaded media ever reaches these helpers (enforced server-side).

import { normaliseGalleryAlbum } from '@/lib/galleryAlbumOptions';

export type SlideshowOrder = 'newest' | 'oldest' | 'shuffle';
export type SlideshowTransition = 'fade' | 'slide' | 'none';

export interface SlideshowSettings {
  include_photos: boolean;
  include_videos: boolean;
  /** Empty array = all albums. */
  albums: string[];
  order: SlideshowOrder;
  slide_duration_sec: number;
  transition: SlideshowTransition;
  show_caption: boolean;
  loop: boolean;
}

export const SLIDE_DURATION_OPTIONS = [3, 5, 8, 10] as const;

export const DEFAULT_SLIDESHOW_SETTINGS: SlideshowSettings = {
  include_photos: true,
  include_videos: true,
  albums: [],
  order: 'newest',
  slide_duration_sec: 5,
  transition: 'fade',
  show_caption: true,
  loop: true,
};

const ORDERS: SlideshowOrder[] = ['newest', 'oldest', 'shuffle'];
const TRANSITIONS: SlideshowTransition[] = ['fade', 'slide', 'none'];

/** Read slideshow settings off a gallery meta row (host RPC or public RPC), with safe fallbacks. */
export function slideshowSettingsFromRow(row: any): SlideshowSettings {
  if (!row) return { ...DEFAULT_SLIDESHOW_SETTINGS };
  const order = ORDERS.includes(row.slideshow_order) ? row.slideshow_order : DEFAULT_SLIDESHOW_SETTINGS.order;
  const transition = TRANSITIONS.includes(row.slideshow_transition)
    ? row.slideshow_transition
    : DEFAULT_SLIDESHOW_SETTINGS.transition;
  const duration = (SLIDE_DURATION_OPTIONS as readonly number[]).includes(row.slideshow_slide_duration_sec)
    ? row.slideshow_slide_duration_sec
    : (row.slideshow_photo_duration_sec ?? DEFAULT_SLIDESHOW_SETTINGS.slide_duration_sec);
  const includePhotos = row.slideshow_include_photos !== false;
  const includeVideos = row.slideshow_include_videos !== false;
  return {
    include_photos: includePhotos || !includeVideos, // never both off
    include_videos: includeVideos,
    albums: Array.isArray(row.slideshow_albums)
      ? [...new Set(row.slideshow_albums.filter((a: any) => typeof a === 'string').map(normaliseGalleryAlbum))]
      : [],
    order,
    slide_duration_sec: Math.max(3, Math.min(60, Number(duration) || 5)),
    transition,
    show_caption: row.slideshow_show_caption !== false,
    loop: row.slideshow_loop !== false,
  };
}

interface SlideshowEligible {
  id: string;
  kind: string;
  album?: string | null;
  uploaded_at?: string | null;
}

// Stable pseudo-random weight from an id so a "shuffle" order stays consistent across refetches.
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Filter + order approved media according to the saved slideshow settings. */
export function applySlideshowSettings<T extends SlideshowEligible>(items: T[], s: SlideshowSettings): T[] {
  const filtered = items.filter((i) => {
    if (i.kind === 'photo' && !s.include_photos) return false;
    if (i.kind === 'video' && !s.include_videos) return false;
    if (i.kind !== 'photo' && i.kind !== 'video') return false;
    if (s.albums.length > 0) {
      const selectedAlbums = new Set(s.albums.map(normaliseGalleryAlbum));
      if (!selectedAlbums.has(normaliseGalleryAlbum(i.album))) return false;
    }
    return true;
  });

  const time = (i: T) => (i.uploaded_at ? new Date(i.uploaded_at).getTime() : 0);
  const sorted = [...filtered];
  if (s.order === 'newest') sorted.sort((a, b) => time(b) - time(a));
  else if (s.order === 'oldest') sorted.sort((a, b) => time(a) - time(b));
  else sorted.sort((a, b) => hashId(a.id) - hashId(b.id));
  return sorted;
}
