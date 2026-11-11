import { describe, expect, it } from 'vitest';
import { operationalPage, parseOperationalCursor } from '../../supabase/functions/_shared/adminOperationalPagination';
describe('operational history cursor and page boundaries',()=>{
 it.each([{at:'2026-10-19T09:00:00.123+00:00',id:'11111111-1111-4111-8111-111111111111'},{at:null,id:'12345'}])('preserves safe timestamp and null cursors',value=>expect(parseOperationalCursor(value)).toEqual(value));
 it.each([null,{},[],{at:'2026-10-19T09:00:00Z),id.eq.any',id:'1'},{at:'invalid',id:'1'},{at:null,id:'1),id.gt.0'},{at:null,id:'1',table:'auth.users'}])('rejects malformed or filter-injection cursors %j',value=>expect(()=>parseOperationalCursor(value)).toThrow('Invalid history cursor'));
 it('uses one lookahead row to mark older history without losing the last visible row',()=>{const rows=Array.from({length:501},(_,i)=>({id:String(i+1),created_at:'2026-10-19T09:00:00Z'}));const page=operationalPage(rows,'created_at');expect(page.records).toHaveLength(500);expect(page.page).toEqual({has_more:true,cursor:{at:'2026-10-19T09:00:00Z',id:'500'}});expect(operationalPage(rows.slice(0,500),'created_at').page).toEqual({has_more:false,cursor:null});});
 it('supports null-time history and honest empty final pages',()=>{const rows=Array.from({length:501},(_,i)=>({id:String(i),sent_at:null}));expect(operationalPage(rows,'sent_at').page.cursor).toEqual({at:null,id:'499'});expect(operationalPage([],'sent_at')).toEqual({records:[],page:{has_more:false,cursor:null}});});
});

it.each([null, {}, ['not a record'], [null], [[]]])('rejects non-record reporting data %j', value => { expect(() => operationalPage(value, 'created_at')).toThrow('Invalid operational rows'); });
