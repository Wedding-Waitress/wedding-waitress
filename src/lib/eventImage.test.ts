import { describe, expect, it } from 'vitest';
import { clampEventImagePosition, clampEventImageZoom, eventImageCropTransform, eventImageDirectory, eventImageObjectPath, isEventImageBackendUnavailable, isEventImageZoomBackendUnavailable, validateEventImageFile } from './eventImage';

describe('event image paths', () => {
  it('keeps draft and event images beneath the owning account path', () => {
    const draft = { kind: 'draft' as const, ownerId: 'owner-1', draftId: 'draft-1' };
    const event = { kind: 'event' as const, ownerId: 'owner-1', eventId: 'event-1' };
    expect(eventImageDirectory(draft)).toBe('owner-1/drafts/draft-1');
    expect(eventImageDirectory(event)).toBe('owner-1/events/event-1');
    expect(eventImageObjectPath(draft, 'image/jpeg')).toMatch(/^owner-1\/drafts\/draft-1\/.+\.jpg$/);
    expect(eventImageObjectPath(event, 'image/webp')).toMatch(/^owner-1\/events\/event-1\/.+\.webp$/);
  });

  it('recognises a missing bucket or unapplied event field contract', () => {
    expect(isEventImageBackendUnavailable(new Error('Bucket not found'))).toBe(true);
    expect(isEventImageBackendUnavailable(new Error("column 'event_image_path' is missing from schema cache"))).toBe(true);
    expect(isEventImageBackendUnavailable(new Error('network timeout'))).toBe(false);
    expect(isEventImageZoomBackendUnavailable(new Error("column 'event_image_zoom' is missing from schema cache"))).toBe(true);
    expect(isEventImageZoomBackendUnavailable(new Error("column 'event_image_path' is missing from schema cache"))).toBe(false);
  });

  it('reuses hardened validation for invalid formats and the five-megabyte limit', async () => {
    const invalid = new File([new Uint8Array([0x4d, 0x5a])], 'not-an-image.jpg', { type: 'image/jpeg' });
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
    await expect(validateEventImageFile(invalid)).rejects.toThrow(/genuine JPG, PNG or WebP/i);
    await expect(validateEventImageFile(oversized)).rejects.toThrow(/5 MB or smaller/i);
  });

  it.each([
    ['PHOTO.JPG', 750 * 1024],
    ['PHOTO.JPEG', 1100 * 1024],
  ])('accepts a genuine normal-sized JPEG regardless of extension case: %s', async (name, size) => {
    const bytes = new Uint8Array(size);
    bytes.set([0xff, 0xd8, 0xff]);
    const candidate = new File([bytes], name, { type: 'image/jpeg' });
    await expect(validateEventImageFile(candidate)).resolves.toMatchObject({ file: candidate, mime: 'image/jpeg' });
  });

  it('clamps crop coordinates and zoom to the supported Fill Frame range', () => {
    expect(clampEventImagePosition(-25)).toBe(0);
    expect(clampEventImagePosition(125)).toBe(100);
    expect(clampEventImageZoom(50)).toBe(100);
    expect(clampEventImageZoom(275)).toBe(200);
    expect(eventImageCropTransform({ fit: 'cover', positionX: 0, positionY: 100, zoom: 200 })).toBe('scale(2) translate(25%, -25%)');
    expect(eventImageCropTransform({ fit: 'contain', positionX: 0, positionY: 100, zoom: 200 })).toBeUndefined();
  });
});
