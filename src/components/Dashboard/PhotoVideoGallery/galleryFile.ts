// Shared file helpers for the Photo & Video Sharing dashboard grid + lightbox.
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { sharedMediaFilename } from '@/lib/sharedPhotoFilename';
import { guestbookRecordingFilename } from '@/lib/audioGuestbookFilename';
import { photoBoothFilename } from '@/lib/photoBoothFilename';

export async function downloadSignedUrl(url: string, filenameHint: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filenameHint || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function filenameFor(item: GalleryItem, eventName?: string | null): string {
  // Shared photos and shared videos use the numbered "00001-Event-Name.ext" scheme.
  const shared = sharedMediaFilename(item as any, eventName);
  if (shared) return shared;

  // Private Audio Guestbook recordings use "00001-Event-Name-Audio.ext".
  const recording = guestbookRecordingFilename(item as any, eventName);
  if (recording) return recording;

  // Digital Photo Booth captures + strips use "00001-Event-Name-Photo-Booth.ext".
  const booth = photoBoothFilename(item as any, eventName);
  if (booth) return booth;

  const ext = (item.storage_path.split('.').pop() || (item.kind === 'video' ? 'mp4' : 'jpg')).split('?')[0];
  const who = (item.uploader_name || 'guest').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'guest';
  return `${who}-${item.id.slice(0, 8)}.${ext}`;
}
