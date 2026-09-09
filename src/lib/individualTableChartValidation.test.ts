import {describe,it,expect} from 'vitest';
import {individualChartCapacityError} from './individualTableChartValidation';
describe('Individual chart capacity checks',()=>{
 const table={id:'t',table_no:2,limit_seats:20} as any;
 it.each(['round','square'])('accepts exactly 20 seats for %s',tableShape=>expect(individualChartCapacityError({tableShape} as any,table,[])).toBeNull());
 it.each(['round','square'])('rejects more than 20 seats for %s',tableShape=>expect(individualChartCapacityError({tableShape} as any,{...table,limit_seats:21},[])).toContain('Choose Long Table'));
 it('also checks actual guest count when capacity is stale',()=>expect(individualChartCapacityError({tableShape:'round'} as any,table,Array.from({length:21},()=>({table_id:'t'} as any)))).toContain('20-guest'));
 it('accepts 42 long-table seats',()=>expect(individualChartCapacityError({tableShape:'long'} as any,{...table,limit_seats:42},[])).toBeNull());
 it('rejects 43 long-table seats',()=>expect(individualChartCapacityError({tableShape:'long'} as any,{...table,limit_seats:43},[])).toContain('42-guest'));
 it('keeps head tables independent of the shape picker',()=>expect(individualChartCapacityError({tableShape:'round'} as any,{...table,limit_seats:22,table_purpose:'head'},[])).toBeNull());
});
