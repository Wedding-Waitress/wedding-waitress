import { describe,it,expect } from 'vitest';
import { refundAmountMinor,validateRefundSelection } from '../../supabase/functions/_shared/adminRefundRules';
describe('refund amount and access validation',()=>{
 it.each([['49',4900],['1.01',101],['0.10',10]])('parses %s without floating-point rounding',(input,expected)=>expect(refundAmountMinor(input)).toBe(expected));
 it.each(['1e3','-49','0','1.001','Infinity','NaN','1,000'])('rejects invalid amount %s',input=>expect(()=>refundAmountMinor(input)).toThrow());
 it('requires an explicit access choice and sufficient reasons',()=>{expect(()=>validateRefundSelection(100,100,'', 'Review reason','')).toThrow();expect(()=>validateRefundSelection(100,100,'suspend','Review reason','')).toThrow();expect(()=>validateRefundSelection(101,100,'keep','Review reason','')).toThrow();expect(()=>validateRefundSelection(100,100,'keep','Review reason','')).not.toThrow();});
});
