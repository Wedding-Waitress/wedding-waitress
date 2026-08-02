import { describe, it, expect } from 'vitest';
import { safeEventName, sharedPhotoFilename, sharedVideoFilename, sharedMediaFilename, isSharedPhoto, isSharedVideo } from '@/lib/sharedPhotoFilename';

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
  it('removes every unsafe filesystem character', () => {
    expect(safeEventName('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });
  it('falls back to a safe name when the event name is empty or unusable', () => {
    expect(safeEventName('')).toBe('Event');
    expect(safeEventName('***')).toBe('Event');
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

const video = (over: any = {}) => ({
  id: 'v1',
  kind: 'video',
  mime_type: 'video/mp4',
  storage_path: 'ev/1/clip.mp4',
  source_category: 'guest_upload',
  share_video_seq: 1,
  ...over,
});

describe('sharedVideoFilename', () => {
  it('numbers shared videos independently from photos', () => {
    expect(sharedVideoFilename(video({ share_video_seq: 2, share_photo_seq: 9 }), "Jason & Linda's Wedding"))
      .toBe('00002-Jason-and-Lindas-Wedding.mp4');
  });
  it('preserves the original extension', () => {
    expect(sharedVideoFilename(video({ storage_path: 'a/b.mov', share_video_seq: 3 }), 'My Event'))
      .toBe('00003-My-Event.mov');
    expect(sharedVideoFilename(video({ storage_path: 'a/b', mime_type: 'video/webm' }), 'My Event'))
      .toBe('00001-My-Event.webm');
  });
  it('excludes guestbook recordings, audio and photo booth media', () => {
    expect(sharedVideoFilename(video({ source_category: 'guestbook_recording' }), 'E')).toBeNull();
    expect(sharedVideoFilename(video({ kind: 'audio' }), 'E')).toBeNull();
    expect(sharedVideoFilename(video({ source_category: 'photo_booth' }), 'E')).toBeNull();
    expect(isSharedVideo(video({ source_category: 'guestbook_recording' }) as any)).toBe(false);
  });
  it('returns null without a sequence', () => {
    expect(sharedVideoFilename(video({ share_video_seq: null }), 'E')).toBeNull();
  });
});

describe('sharedMediaFilename', () => {
  it('routes photos and videos to their own sequences', () => {
    expect(sharedMediaFilename(photo({ share_photo_seq: 4 }), 'My Event')).toBe('00004-My-Event.jpg');
    expect(sharedMediaFilename(video({ share_video_seq: 4 }), 'My Event')).toBe('00004-My-Event.mp4');
  });
});
