import {expect,it} from 'vitest';
import {promotionSydneyDate,validatePromotionExpiry,promotionExpiryLabel} from '../../supabase/functions/_shared/promotionExpiryRules';
const now=Date.parse('2026-10-30T10:00:00Z');
it('uses the Sydney calendar date rather than the host timezone',()=>{expect(promotionSydneyDate(Date.parse('2026-10-30T13:30:00Z'))).toBe('2026-10-31');expect(promotionSydneyDate(Date.parse('2027-06-15T13:30:00Z'))).toBe('2027-06-15');});
it('accepts No expiry and today/future dates, including valid leap days',()=>{expect(validatePromotionExpiry(null,now)).toBeNull();expect(validatePromotionExpiry('2026-10-30',now)).toBe('2026-10-30');expect(validatePromotionExpiry('2028-02-29',now)).toBe('2028-02-29');});
it.each(['','2027-02-29','2027-04-31','2027-1-01','2026-10-29',5,{},'2027-01-01T00:00:00Z'])('rejects invalid, missing chosen or past expiry %j',value=>expect(()=>validatePromotionExpiry(value,now)).toThrow());
it('labels the selected calendar day and the exclusive expiry boundary clearly',()=>{expect(promotionExpiryLabel(null)).toBe('No expiry');expect(promotionExpiryLabel('2027-01-15','2027-01-15T13:00:00Z',Date.parse('2027-01-15T12:59:59Z'))).toBe('Expires 15 Jan 2027, end of day (Australia/Sydney)');expect(promotionExpiryLabel('2027-01-15','2027-01-15T13:00:00Z',Date.parse('2027-01-15T13:00:00Z'))).toMatch(/^Expired /);});
