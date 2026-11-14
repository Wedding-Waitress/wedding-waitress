import {describe,it,expect} from 'vitest';
import {matchesGuestListSearch} from './guestListSearch';
const guest={first_name:'  Ada ',last_name:'  Lovelace ',family_group:'Lovelace Family'};
describe('Private Guest List search',()=>{
 it.each(['Ada Lovelace','  ADA   LOVELACE  ','Ada','love','Lovelace Family'])('matches names and family groups consistently for %s',query=>{
  expect([guest].filter(g=>matchesGuestListSearch(g,query))).toEqual([guest]);
 });
 it('keeps blank searches inclusive and missing names safe',()=>{
  expect(matchesGuestListSearch({},'   ')).toBe(true);
  expect(matchesGuestListSearch({},'Ada')).toBe(false);
  expect(matchesGuestListSearch(guest,'unrelated')).toBe(false);
 });
});
