import { describe, expect, it } from 'vitest';
import { isInitialSearchAvailable, matchesGuestSearch } from './guestNameSearch';

describe('seven-day guest search window', () => {
  it('opens at midnight seven calendar days before in the event timezone', () => {
    expect(isInitialSearchAvailable('2027-09-05', 'Australia/Sydney', new Date('2027-08-28T13:59:59Z'))).toBe(false);
    expect(isInitialSearchAvailable('2027-09-05', 'Australia/Sydney', new Date('2027-08-28T14:00:00Z'))).toBe(true);
    expect(isInitialSearchAvailable('2027-09-05', 'Australia/Sydney', new Date('2027-09-06T00:00:00Z'))).toBe(true);
  });
  it('uses calendar days across daylight-saving changes', () => {
    expect(isInitialSearchAvailable('2027-10-09', 'Australia/Sydney', new Date('2027-10-01T14:00:00Z'))).toBe(true);
  });
  it('keeps full-name matching when date or timezone is unavailable', () => {
    expect(isInitialSearchAvailable(null, 'Australia/Sydney')).toBe(false);
    expect(isInitialSearchAvailable('2027-09-05', 'invalid')).toBe(false);
  });
});
describe('guest name matching', () => {
  const guests = [{ first_name: 'James', last_name: 'Bennett' }, { first_name: 'James', last_name: 'Bob' }, { first_name: 'Jamie', last_name: 'Bennett' }];
  it('requires full name before the window', () => {
    expect(matchesGuestSearch(guests[0], 'James B', false)).toBe(false);
    expect(matchesGuestSearch(guests[0], '  JAMES   Bennett ', false)).toBe(true);
  });
  it('returns both James B matches but excludes different first names', () => {
    expect(guests.filter(g => matchesGuestSearch(g, 'James B', true))).toEqual(guests.slice(0, 2));
  });
  it('does not allow first-name-only or three-letter discovery', () => {
    expect(guests.some(g => matchesGuestSearch(g, 'Jam', true))).toBe(false);
    expect(guests.some(g => matchesGuestSearch(g, 'James', true))).toBe(false);
    expect(guests.some(g => matchesGuestSearch(g, 'Jam B', true))).toBe(false);
  });
  it('supports multiword first names and progressively narrows surnames', () => {
    expect(matchesGuestSearch({ first_name: 'Mary Jane', last_name: 'Smith' }, 'mary jane s', true)).toBe(true);
    expect(guests.filter(g => matchesGuestSearch(g, 'James Ben', true))).toEqual([guests[0]]);
  });
});
