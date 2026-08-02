import { describe, it, expect } from 'vitest';
import { photoBoothFilename, photoBoothExtension, isPhotoBoothMedia } from './photoBoothFilename';

const booth = (over: any = {}) => ({
  source_category: 'photo_booth',
  kind: 'photo',
  mime_type: 'image/jpeg',
  storage_path: 'ev/abc.jpg',
  photo_booth_seq: 1,
  ...over,
});

describe('photoBoothFilename', () => {
  it('names booth captures with the 5-digit combined sequence', () => {
    expect(photoBoothFilename(booth(), "Jason and Linda's Wedding"))
      .toBe('00001-Jason-and-Lindas-Wedding-Photo-Booth.jpg');
  });

  it('includes photo strips in the same sequence and preserves extension', () => {
    expect(photoBoothFilename(booth({ is_photo_booth_strip: true, photo_booth_seq: 12, storage_path: 'ev/strip.png', mime_type: 'image/png' }), 'Sam & Ali'))
      .toBe('00012-Sam-and-Ali-Photo-Booth.png');
  });

  it('ignores shared uploads and guestbook content', () => {
    expect(photoBoothFilename(booth({ source_category: 'guest_upload' }), 'X')).toBeNull();
    expect(photoBoothFilename(booth({ source_category: 'guestbook_recording' }), 'X')).toBeNull();
  });

  it('returns null when unnumbered or event name missing', () => {
    expect(photoBoothFilename(booth({ photo_booth_seq: null }), 'X')).toBeNull();
    expect(photoBoothFilename(booth(), '')).toBeNull();
  });

  it('classifies legacy rows via is_photo_booth flag', () => {
    expect(isPhotoBoothMedia({ is_photo_booth: true } as any)).toBe(true);
  });

  it('falls back to mime type for extension', () => {
    expect(photoBoothExtension({ storage_path: 'ev/noext', mime_type: 'image/webp' } as any)).toBe('webp');
  });
});
