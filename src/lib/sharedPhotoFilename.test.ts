import { describe, it, expect } from 'vitest';
import { safeEventName, sharedPhotoFilename, isSharedPhoto } from '@/lib/sharedPhotoFilename';

const photo = (over: any = {}) => ({
  id: 'abcdef12-0000-0000-0000-000000000000',
  kind: 'photo',
  mime_type: 'image/jpeg',
  storage_path: 'ev/1/photo.jpg',
  source_category: 'guest_upload',
  share_photo_seq: 1,
  ...over,
});

describe('safeEventName', () => {
  it('replaces spaces, & and apostrophes', () => {
    expect(safeEventName("Jason & Linda's Wedding")).toBe('Jason-and-Lindas-Wedding');
  });
  it('strips unsupported characters', () => {
    expect(safeEventName('Ana/Bo: Party!')).toBe('Ana-Bo-Party');
  });
});

describe('sharedPhotoFilename', () => {
  it('formats a five-digit number first', () => {
    expect(sharedPhotoFilename(photo(), "Jason & Linda's Wedding")).toBe('00001-Jason-and-Lindas-Wedding.jpg');
  });
  it('preserves the original extension', () => {
    expect(sharedPhotoFilename(photo({ storage_path: 'a/b.webp', share_photo_seq: 3 }), 'My Event'))
      .toBe('00003-My-Event.webp');
  });
  it('excludes videos, photo booth and guestbook content', () => {
    expect(sharedPhotoFilename(photo({ kind: 'video' }), 'E')).toBeNull();
    expect(sharedPhotoFilename(photo({ source_category: 'photo_booth' }), 'E')).toBeNull();
    expect(sharedPhotoFilename(photo({ source_category: 'guestbook_recording' }), 'E')).toBeNull();
    expect(isSharedPhoto(photo({ source_category: 'photo_booth' }) as any)).toBe(false);
  });
  it('returns null without a sequence or event name', () => {
    expect(sharedPhotoFilename(photo({ share_photo_seq: null }), 'E')).toBeNull();
    expect(sharedPhotoFilename(photo(), '   ')).toBeNull();
  });
});
