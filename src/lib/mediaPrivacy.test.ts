import { describe, it, expect } from 'vitest';
import {
  categoryOf,
  guestVisibleItems,
  guestbookRecordings,
  isPrivateGuestbook,
  isPublicGalleryMedia,
  publicGalleryItems,
} from './mediaPrivacy';

const photo = { id: '1', kind: 'photo', source_category: 'guest_upload', moderation_status: 'approved', event_id: 'e1' };
const video = { id: '2', kind: 'video', source_category: 'guest_upload', moderation_status: 'approved', event_id: 'e1' };
const hiddenPhoto = { id: '3', kind: 'photo', source_category: 'guest_upload', moderation_status: 'hidden', event_id: 'e1' };
const booth = { id: '4', kind: 'photo', source_category: 'photo_booth', moderation_status: 'approved', event_id: 'e1' };
const gbVoice = { id: '5', kind: 'audio', source_category: 'guestbook_recording', moderation_status: 'approved', event_id: 'e1' };
const gbVideo = { id: '6', kind: 'video', source_category: 'guestbook_recording', moderation_status: 'approved', event_id: 'e1' };
const gbText = { id: '7', source_category: 'guestbook_text', moderation_status: 'approved', event_id: 'e1' };
const otherEventPhoto = { id: '8', kind: 'photo', source_category: 'guest_upload', moderation_status: 'approved', event_id: 'e2' };

const all = [photo, video, hiddenPhoto, booth, gbVoice, gbVideo, gbText];

describe('media privacy classification', () => {
  it('classifies by source category, not MIME/kind', () => {
    expect(categoryOf(gbVideo)).toBe('guestbook_recording');
    expect(isPrivateGuestbook(gbVideo)).toBe(true);
    expect(isPublicGalleryMedia(gbVideo)).toBe(false);
    expect(categoryOf(video)).toBe('guest_upload');
    expect(isPublicGalleryMedia(video)).toBe(true);
  });

  it('falls back to legacy flags for un-migrated rows', () => {
    expect(categoryOf({ is_guestbook: true, kind: 'video' })).toBe('guestbook_recording');
    expect(categoryOf({ is_photo_booth: true, kind: 'photo' })).toBe('photo_booth');
    expect(categoryOf({ kind: 'photo' })).toBe('guest_upload');
  });

  it('public gallery returns photos, videos and photo booth captures only', () => {
    const pub = publicGalleryItems(all);
    expect(pub.map(i => i.id).sort()).toEqual(['1', '2', '3', '4']);
  });

  it('live slideshow / guest views exclude all guestbook content and hidden items', () => {
    const visible = guestVisibleItems(all);
    expect(visible.map(i => i.id).sort()).toEqual(['1', '2', '4']);
    expect(visible.some(i => i.source_category?.startsWith('guestbook'))).toBe(false);
  });

  it('text messages never appear publicly', () => {
    expect(isPublicGalleryMedia(gbText)).toBe(false);
    expect(publicGalleryItems(all).some(i => i.id === gbText.id)).toBe(false);
    expect(guestVisibleItems(all).some(i => i.id === gbText.id)).toBe(false);
  });

  it('guestbook audio AND video recordings never appear publicly', () => {
    for (const rec of [gbVoice, gbVideo]) {
      expect(isPublicGalleryMedia(rec)).toBe(false);
      expect(guestVisibleItems(all).some(i => i.id === rec.id)).toBe(false);
    }
  });

  it('approving guestbook content does not make it public', () => {
    const approved = { ...gbVoice, moderation_status: 'approved' as const };
    expect(guestVisibleItems([approved])).toHaveLength(0);
    expect(publicGalleryItems([approved])).toHaveLength(0);
  });

  it('organiser voice workspace keeps audio and video recordings with their notes', () => {
    const withNote = { ...gbVideo, guestbook_message: 'Congrats!' };
    const recs = guestbookRecordings([...all, withNote]);
    expect(recs.map(i => i.id).sort()).toEqual(['5', '6', '6']);
    expect(recs.find(i => 'guestbook_message' in i)?.guestbook_message).toBe('Congrats!');
  });

  it('one event cannot leak into another event view', () => {
    const forEvent1 = guestVisibleItems([...all, otherEventPhoto].filter(i => i.event_id === 'e1'));
    expect(forEvent1.every(i => i.event_id === 'e1')).toBe(true);
    expect(forEvent1.some(i => i.id === otherEventPhoto.id)).toBe(false);
  });
});
