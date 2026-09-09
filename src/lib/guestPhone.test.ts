import { describe, expect, it } from 'vitest';
import { detectGuestPhoneCountry, normalizeGuestPhone } from './guestPhone';

describe('guest phone region detection', () => {
  it('detects Australian time zones even with a US browser language', () => {
    for (const zone of ['Australia/Sydney', 'Australia/Perth', 'Australia/Adelaide', 'Antarctica/Macquarie']) {
      expect(detectGuestPhoneCountry(zone, ['en-US'])).toBe('AU');
    }
  });
  it('uses explicit locale regions without guessing a country from language alone', () => {
    expect(detectGuestPhoneCountry('UTC', ['en-AU'])).toBe('AU');
    expect(detectGuestPhoneCountry('Europe/London', ['en-GB'])).toBe('GB');
    expect(detectGuestPhoneCountry('UTC', ['en'])).toBeUndefined();
  });
});

describe('guest phone normalization', () => {
  it.each(['0411569505', '0411 569 505', '(04) 1156-9505', '+61 411 569 505', '411569505'])(
    'normalizes Australian input %s', value => expect(normalizeGuestPhone(value, 'AU')).toBe('+61411569505'),
  );
  it('preserves an explicit international country code', () => {
    expect(normalizeGuestPhone('+44 7700 900123', 'AU')).toBe('+447700900123');
    expect(normalizeGuestPhone('07700 900123', 'GB')).toBe('+447700900123');
  });
  it('keeps optional empty numbers empty and rejects incomplete or non-phone input', () => {
    expect(normalizeGuestPhone('', 'AU')).toBe('');
    expect(() => normalizeGuestPhone('0411', 'AU')).toThrow();
    expect(() => normalizeGuestPhone('call 0411569505', 'AU')).toThrow();
  });
});
