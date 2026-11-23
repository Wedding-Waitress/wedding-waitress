import { describe, expect, it } from 'vitest';
import { eventCalendarDayDistance, isInitialSearchAvailable, matchesGuestSearch } from './guestNameSearch';

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
  const guests = [
    { first_name: 'Andrew', last_name: 'Bennett' },
    { first_name: 'Andrea', last_name: 'Smith' },
    { first_name: 'Anderson', last_name: 'Jones' },
    { first_name: 'Sandra', last_name: 'Andrews' },
  ];
  const matches = (query: string, open = true) => guests.filter(g => matchesGuestSearch(g, query, open));
  it('requires full first and last name before the window', () => {
    expect(matches('And', false)).toEqual([]);
    expect(matches('Andrew', false)).toEqual([]);
    expect(matches('Andrew B', false)).toEqual([]);
    expect(matches('  ANDREW   Bennett ', false)).toEqual([guests[0]]);
  });
  it('automatically finds every shared first-name prefix from three letters', () => {
    expect(matches('')).toEqual([]);
    expect(matches('An')).toEqual([]);
    expect(matches('And')).toEqual(guests.slice(0, 3));
    expect(matches('  aND  ')).toEqual(guests.slice(0, 3));
    expect(matches('Andre')).toEqual(guests.slice(0, 2));
    expect(matches('Andrew')).toEqual([guests[0]]);
    expect(matches('Andrewx')).toEqual([]);
  });
  it('matches first-name prefixes rather than surname prefixes or substrings', () => {
    expect(matches('Ben')).toEqual([]);
    expect(matches('ndr')).toEqual([]);
    expect(matches('Andrew B')).toEqual([]);
  });
  it('preserves full-name invitation prefill and multiword first names', () => {
    expect(matches('Andrew Bennett')).toEqual([guests[0]]);
    expect(matchesGuestSearch({ first_name: 'Mary Jane', last_name: 'Smith' }, 'mary j', true)).toBe(true);
  });
  it('switches matching at the seven-day local midnight boundary', () => {
    const before = isInitialSearchAvailable('2027-09-05', 'Australia/Sydney', new Date('2027-08-28T13:59:59Z'));
    const at = isInitialSearchAvailable('2027-09-05', 'Australia/Sydney', new Date('2027-08-28T14:00:00Z'));
    expect(matches('And', before)).toEqual([]);
    expect(matches('And', at)).toEqual(guests.slice(0, 3));
  });
});

describe('event calendar day arithmetic',()=>{
 it('keeps an eight-day difference across daylight saving outside the lock window',()=>{
  expect(eventCalendarDayDistance('2027-10-10','Australia/Sydney',new Date('2027-10-01T14:00:00Z'))).toBe(8);
  expect(isInitialSearchAvailable('2027-10-10','Australia/Sydney',new Date('2027-10-01T14:00:00Z'))).toBe(false);
 });
 it('uses the event timezone rather than the viewer date at the boundary',()=>{
  const now=new Date('2027-08-28T14:00:00Z');
  expect(isInitialSearchAvailable('2027-09-05','Australia/Sydney',now)).toBe(true);
  expect(isInitialSearchAvailable('2027-09-05','America/Los_Angeles',now)).toBe(false);
 });
 it('rejects impossible dates rather than silently rolling into another month',()=>{
  expect(eventCalendarDayDistance('2027-02-31','Australia/Sydney')).toBeNull();
  expect(eventCalendarDayDistance('2027-13-01','Australia/Sydney')).toBeNull();
 });
});

it('includes first-name matches even if the surname is blank during the open window',()=>{
 expect(matchesGuestSearch({first_name:'Andrew',last_name:''},'And',true)).toBe(true);
 expect(matchesGuestSearch({first_name:'Andrew',last_name:''},'Andrew',false)).toBe(false);
});

it.each([null,undefined,''])('tolerates a missing surname (%s) without weakening full-name verification',last_name=>{
 expect(matchesGuestSearch({first_name:'Reema',last_name},'',false)).toBe(false);
 expect(matchesGuestSearch({first_name:'Reema',last_name},'Reema',false)).toBe(false);
 expect(matchesGuestSearch({first_name:'Reema',last_name},'Ree',true)).toBe(true);
 expect(matchesGuestSearch({first_name:null,last_name},'Ree',true)).toBe(false);
});
