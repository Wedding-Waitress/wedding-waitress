import { describe, expect, it } from 'vitest';
import { publicRsvpImmediateSaveCopy } from './publicRsvpImmediateSaveCopy';

describe('public recipient RSVP immediate-save copy', () => {
  it('keeps every supported public language complete', () => {
    expect(Object.keys(publicRsvpImmediateSaveCopy)).toEqual(['en', 'it', 'ar', 'vi', 'zh', 'hi', 'tr', 'de', 'es', 'fr', 'nl', 'ja', 'el']);
    const keys = Object.keys(publicRsvpImmediateSaveCopy.en);
    Object.values(publicRsvpImmediateSaveCopy).forEach((copy) => {
      expect(Object.keys(copy)).toEqual(keys);
      Object.values(copy).forEach((text) => expect(text.trim().length).toBeGreaterThan(0));
    });
  });
});
