// Customer-friendly download naming for AUDIO GUESTBOOK RECORDINGS (private).
//
// Format: 00001-Event-Name-Audio.extension  (e.g. 00001-Jason-and-Lindas-Wedding-Audio.webm)
//
// One combined per-event sequence covers BOTH private audio and private video
// Guestbook recordings (source_category = 'guestbook_recording'), ordered by
// submission time. It is independent from shared photos, shared videos and
// Digital Guestbook text messages. Storage objects are never renamed — the name
// is applied at download time only.
import { categoryOf, type ClassifiableItem } from '@/lib/mediaPrivacy';
import { safeEventName } from '@/lib/sharedPhotoFilename';

export interface NameableRecording extends ClassifiableItem {
  kind?: string;
  mime_type?: string;
  storage_path?: string;
  guestbook_recording_seq?: number | null;
}

const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/3gpp': '3gp',
};

/** True when the item is a private Audio Guestbook recording (audio or video). */
export function isGuestbookRecording(item: NameableRecording): boolean {
  return categoryOf(item) === 'guestbook_recording';
}

/** Original extension, preserved from the stored object (falls back to MIME type). */
export function recordingExtension(item: NameableRecording): string {
  const fromPath = (item.storage_path?.split('?')[0].split('.').pop() || '').toLowerCase();
  if (fromPath && /^[a-z0-9]{2,5}$/.test(fromPath)) return fromPath;
  return EXT_BY_MIME[(item.mime_type || '').toLowerCase()] || (item.kind === 'video' ? 'mp4' : 'webm');
}

/**
 * Returns the customer-friendly filename for an Audio Guestbook recording, or
 * null when out of scope (shared media, photo booth) or not yet numbered.
 */
export function guestbookRecordingFilename(
  item: NameableRecording,
  eventName: string | null | undefined,
): string | null {
  if (!isGuestbookRecording(item)) return null;
  const seq = item.guestbook_recording_seq;
  if (typeof seq !== 'number' || !Number.isFinite(seq) || seq < 1) return null;
  const safe = safeEventName(eventName);
  if (!safe) return null;
  return `${String(Math.floor(seq)).padStart(5, '0')}-${safe}-Audio.${recordingExtension(item)}`;
}
