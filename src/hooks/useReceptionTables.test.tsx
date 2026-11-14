import React from 'react';
import {act,cleanup,renderHook} from '@testing-library/react';import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({delay:8000,fail:false,reads:[] as any[],handlers:[] as any[],guestRows:[{table_id:'table',seat_no:1,rsvp:'Attending'},{table_id:null,seat_no:null,rsvp:'attending'}]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{let event='';const q:any={select:()=>q,eq:(_k:string,id:string)=>{event=id;return q;},not:()=>q,order:()=>q,then:(resolve:any,reject:any)=>{m.reads.push({table,event});const rows=table==='tables'?[{id:'table',name:event,table_no:1,limit_seats:8,table_type:'round',notes:null,table_purpose:'standard',head_seating_order:[]}]:structuredClone(m.guestRows);return new Promise(r=>setTimeout(()=>r({data:rows,error:m.fail?Error('offline'):null}),m.delay)).then(resolve,reject);}};return q;},channel:()=>{const q:any={on:(_event:any,filter:any,handler:any)=>{m.handlers.push({filter,handler});return q;},subscribe:()=>q};return q;},removeChannel:vi.fn()}}));
import {useReceptionTables} from './useReceptionTables';import {clearAllCaches} from '@/lib/cacheRegistry';
beforeEach(()=>{vi.useFakeTimers();clearAllCaches();m.delay=8000;m.fail=false;m.reads=[];m.handlers=[];m.guestRows=[{table_id:'table',seat_no:1,rsvp:'Attending'},{table_id:null,seat_no:null,rsvp:'attending'}];});
afterEach(()=>{cleanup();vi.useRealTimers();});
it('accepts an eight-second first response despite the five-second polling interval',async()=>{
 const {result}=renderHook(()=>useReceptionTables('event'));expect(result.current.loading).toBe(true);
 await act(async()=>{await vi.advanceTimersByTimeAsync(8000);});
 expect(result.current.ready).toBe(true);expect(result.current.loading).toBe(false);expect(m.reads).toHaveLength(2);
 expect(result.current.tables[0]).toMatchObject({guest_count:1,occupied_seat_numbers:[1]});expect(result.current.attendingCount).toBe(2);
 await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});expect(result.current.ready).toBe(true);expect(result.current.loading).toBe(false);
 expect(m.reads).toHaveLength(4);
});
it('deduplicates Strict Mode loading and reuses a fresh event snapshot on remount',async()=>{
 const wrapper=({children}:React.PropsWithChildren)=><React.StrictMode>{children}</React.StrictMode>;
 const first=renderHook(()=>useReceptionTables('event'),{wrapper});await act(async()=>{await vi.advanceTimersByTimeAsync(8000);});
 expect(m.reads).toHaveLength(2);first.unmount();const second=renderHook(()=>useReceptionTables('event'),{wrapper});expect(second.result.current.ready).toBe(true);expect(m.reads).toHaveLength(2);
});
it('discards old-event results when switching events',async()=>{
 const {result,rerender}=renderHook(({id})=>useReceptionTables(id),{initialProps:{id:'a'}});
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});m.delay=1000;rerender({id:'b'});
 expect(result.current.tables).toEqual([]);await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});expect(result.current.tables[0].name).toBe('b');
 await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});expect(result.current.tables[0].name).toBe('b');
});
it('shows a retryable error instead of an indefinite loading screen',async()=>{
 m.delay=100;m.fail=true;const {result}=renderHook(()=>useReceptionTables('event'));
 await act(async()=>{await vi.advanceTimersByTimeAsync(100);});expect(result.current.error).toBeTruthy();expect(result.current.loading).toBe(false);
 m.fail=false;act(()=>result.current.retry());await act(async()=>{await vi.advanceTimersByTimeAsync(100);});expect(result.current.ready).toBe(true);expect(result.current.error).toBeNull();
});

it('queues exactly one new read after guest changes arrive during a slow request',async()=>{
 const {result}=renderHook(()=>useReceptionTables('event'));await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
 m.guestRows.push({table_id:'table',seat_no:2,rsvp:'Attending'});
 act(()=>{const handler=m.handlers.find(entry=>entry.filter.table==='guests').handler;handler();handler();handler();});
 await act(async()=>{await vi.advanceTimersByTimeAsync(15999);});
 expect(result.current.attendingCount).toBe(3);expect(result.current.tables[0].guest_count).toBe(2);expect(m.reads).toHaveLength(4);
});

it('pauses polling while Ceremony is active and refreshes stale data without hiding the canvas on return',async()=>{
 m.delay=100;const {result,rerender}=renderHook(({active})=>useReceptionTables('event',active),{initialProps:{active:true}});
 await act(async()=>{await vi.advanceTimersByTimeAsync(100)});rerender({active:false});await act(async()=>{await vi.advanceTimersByTimeAsync(15000)});expect(m.reads).toHaveLength(2);
 rerender({active:true});expect(result.current.ready).toBe(true);expect(result.current.loading).toBe(false);await act(async()=>{await vi.advanceTimersByTimeAsync(100)});expect(m.reads).toHaveLength(4);
});
