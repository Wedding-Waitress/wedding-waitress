import {describe,it,expect} from 'vitest';
import {effectiveCustomerActivity} from './customerActivityDate';
describe('effective recorded customer activity',()=>{
 it('uses signup if no later history exists',()=>expect(effectiveCustomerActivity(null,undefined,'2026-08-10')).toBe('2026-08-10'));
 it('chooses the newest genuine recorded event regardless of source order',()=>expect(effectiveCustomerActivity('2026-08-10','2026-09-12T01:00:00Z','2026-09-11')).toBe('2026-09-12T01:00:00Z'));
 it('does not manufacture a date for missing history',()=>expect(effectiveCustomerActivity(null,'invalid')).toBeNull());
});
