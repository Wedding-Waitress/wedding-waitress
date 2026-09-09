import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateBudgetQuote, fetchBudgetExchangeQuote } from './eventBudgetExchange';
const now=Date.parse('2026-09-08T04:00:00Z');
const valid={base:'AUD',date:'2026-09-07',rates:{USD:.66}};
afterEach(()=>vi.unstubAllGlobals());
describe('budget exchange quotes',()=>{
 it('accepts the latest business-day rate without inventing a publication date',()=>expect(validateBudgetQuote(valid,'AUD','USD',now)).toEqual({from:'AUD',to:'USD',rate:.66,date:'2026-09-07'}));
 it.each([0,-1,NaN,Infinity,undefined,'0.66'])('rejects invalid rates %s',rate=>expect(()=>validateBudgetQuote({...valid,rates:{USD:rate}},'AUD','USD',now)).toThrow());
 it.each(['2026-08-01','2026-09-10','invalid'])('rejects stale/future/invalid dates %s',date=>expect(()=>validateBudgetQuote({...valid,date},'AUD','USD',now)).toThrow());
 it('rejects a different base currency',()=>expect(()=>validateBudgetQuote({...valid,base:'EUR'},'AUD','USD',now)).toThrow());
 it('does not substitute a rate when the service fails',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));await expect(fetchBudgetExchangeQuote('AUD','USD')).rejects.toThrow('unavailable');});
});
