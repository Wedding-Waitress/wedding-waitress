import { describe, it, expect } from 'vitest';
import { guestbookRecordingFilename, isGuestbookRecording, recordingExtension } from './audioGuestbookFilename';

const rec = (over: any = {}) => ({
  kind: 'audio',
  source_category: 'guestbook_recording',
  storage_path: 'events/x/guestbook/abc.webm',
  guestbook_recording_seq: 1,
  ...over,
});

describe('audio guestbook filenames', () => {
  it('names audio recordings with the combined sequence', () => {
    expect(guestbookRecordingFilename(rec(), "Jason & Linda's Wedding")).toBe('00001-Jason-and-Lindas-Wedding-Audio.webm');
  });

  it('uses the same sequence for video recordings', () => {
    expect(guestbookRecordingFilename(rec({ kind: 'video', storage_path: 'e/g/v.mp4', guestbook_recording_seq: 2 }), 'My Event'))
      .toBe('00002-My-Event-Audio.mp4');
  });

  it('preserves original extension', () => {
    expect(recordingExtension(rec({ storage_path: 'a/b/c.m4a' }))).toBe('m4a');
    expect(recordingExtension(rec({ storage_path: 'a/b/c', mime_type: 'audio/mpeg' }))).toBe('mp3');
  });

  it('excludes shared uploads and photo booth media', () => {
    expect(isGuestbookRecording({ source_category: 'guest_upload', kind: 'video' })).toBe(false);
    expect(guestbookRecordingFilename({ source_category: 'photo_booth', kind: 'photo', guestbook_recording_seq: 1 } as any, 'My Event')).toBeNull();
  });

  it('returns null without a sequence', () => {
    expect(guestbookRecordingFilename(rec({ guestbook_recording_seq: null }), 'My Event')).toBeNull();
  });
});
