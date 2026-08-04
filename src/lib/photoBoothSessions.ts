// Ordering helpers for Digital Photo Booth capture sets.
//
// A booth session produces four individual captures plus one completed photo
// strip. Storage order is chronological (individuals first, strip last), but
// everywhere in the organiser workspace a set must be presented and downloaded
// as: completed strip, then individual photos 1-4.
import { categoryOf, type ClassifiableItem } from '@/lib/mediaPrivacy';

export interface BoothOrderable extends ClassifiableItem {
  id: string;
  photo_booth_seq?: number | null;
  uploaded_at?: string | null;
  is_photo_booth_strip?: boolean;
}

export interface BoothSession<T> {
  /** 1-based session number, oldest session first. */
  index: number;
  /** Strip first, then the individual captures in capture order. */
  items: T[];
}

function seqOf(i: BoothOrderable): number {
  if (typeof i.photo_booth_seq === 'number') return i.photo_booth_seq;
  return i.uploaded_at ? Date.parse(i.uploaded_at) : 0;
}

/**
 * Groups Digital Photo Booth items into sessions (oldest first). Each session's
 * items are ordered strip-first. Non-booth items are ignored.
 */
export function groupPhotoBoothSessions<T extends BoothOrderable>(items: T[]): BoothSession<T>[] {
  const booth = items
    .filter(i => categoryOf(i) === 'photo_booth')
    .sort((a, b) => seqOf(a) - seqOf(b));

  const sessions: BoothSession<T>[] = [];
  let pending: T[] = [];

  const push = (strip: T | null, individuals: T[]) => {
    if (!strip && individuals.length === 0) return;
    sessions.push({
      index: sessions.length + 1,
      items: strip ? [strip, ...individuals] : individuals,
    });
  };

  for (const item of booth) {
    if (item.is_photo_booth_strip) {
      push(item, pending);
      pending = [];
    } else {
      pending.push(item);
    }
  }
  push(null, pending);

  return sessions;
}

/**
 * Returns the items reordered so each booth set reads strip-first.
 * `direction` controls session order only — intra-set order never changes.
 */
export function orderPhotoBoothItems<T extends BoothOrderable>(
  items: T[],
  direction: 'newest' | 'oldest' = 'oldest',
): T[] {
  const sessions = groupPhotoBoothSessions(items);
  const ordered = direction === 'newest' ? [...sessions].reverse() : sessions;
  const flat = ordered.flatMap(s => s.items);
  const known = new Set(flat.map(i => i.id));
  // Preserve any non-booth items at the end, untouched.
  return [...flat, ...items.filter(i => !known.has(i.id))];
}

/** ZIP filename prefix for a position inside a capture set. */
export function boothSetPrefix(positionInSet: number, isStrip: boolean): string {
  if (isStrip) return '01-photo-strip';
  const n = Math.max(1, Math.min(4, positionInSet));
  return `${String(n + 1).padStart(2, '0')}-individual-photo-${n}`;
}
