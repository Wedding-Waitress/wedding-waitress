import {it,expect,vi,beforeEach} from 'vitest';
import {renderHook,act,waitFor} from '@testing-library/react';
const api=vi.hoisted(()=>({writes:[] as any[],toast:vi.fn(),fail:false,items:[{id:'i',order_index:0,description_rich:{text:'Existing',bullets:['Keep']},is_bold:true,is_section_header:true}]}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{let mode='read',payload:any;const c:any={select(){return c},eq(){return c},in(){return c},order(){return c},single(){return c},maybeSingle(){return c},update(p:any){mode='update';payload=p;return c},insert(p:any){mode='insert';payload=p;return c},upsert(p:any){mode='upsert';payload=p;return c},delete(){mode='delete';return c},then(resolve:any){if(mode!=='read')api.writes.push({table,mode,payload});return Promise.resolve({error:api.fail&&(mode==='update'||mode==='upsert')?{message:'offline'}:null,data:mode==='upsert'?payload:mode==='insert'?{id:'copy',...payload}:table==='running_sheets'?{id:'sheet',event_id:'event',user_id:'owner',section_label:'Run Sheet',section_notes:null}:table==='running_sheet_items'?api.items:[]}).then(resolve)}};return c},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:vi.fn()}}));
import {useRunningSheet} from './useRunningSheet';
beforeEach(()=>{api.writes.length=0;api.fail=false;api.toast.mockClear()});
it('merges rapid row and meta field edits',async()=>{const {result}=renderHook(()=>useRunningSheet('event'));await waitFor(()=>expect(result.current.sheet?.items).toHaveLength(1));act(()=>{result.current.updateItem('i',{time_text:'5 PM'});result.current.updateItem('i',{responsible:'MC'});result.current.setSectionLabel('Schedule');result.current.setSectionNotes('Remember this');});await waitFor(()=>expect(api.writes.filter(w=>w.mode==='update')).toHaveLength(2));expect(api.writes.find(w=>w.table==='running_sheet_items').payload).toEqual({time_text:'5 PM',responsible:'MC'});expect(api.writes.find(w=>w.table==='running_sheets').payload).toEqual({section_label:'Schedule',section_notes:'Remember this'});});
it('flushes edits when leaving before the debounce expires',async()=>{const {result,unmount}=renderHook(()=>useRunningSheet('event'));await waitFor(()=>expect(result.current.sheet).toBeTruthy());act(()=>result.current.updateItem('i',{responsible:'Venue'}));unmount();await waitFor(()=>expect(api.writes.some(w=>w.payload?.responsible==='Venue')).toBe(true));});
it('reports rejected saves',async()=>{const {result}=renderHook(()=>useRunningSheet('event'));await waitFor(()=>expect(result.current.sheet).toBeTruthy());api.fail=true;act(()=>result.current.updateItem('i',{responsible:'Venue'}));await waitFor(()=>expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Row not saved'})));});
it('duplicates rich content, formatting and header state',async()=>{const {result}=renderHook(()=>useRunningSheet('event'));await waitFor(()=>expect(result.current.sheet).toBeTruthy());await act(async()=>{await result.current.duplicateItem(api.items[0] as any)});expect(api.writes.find(w=>w.mode==='insert').payload).toMatchObject({description_rich:{text:'Existing',bullets:['Keep']},is_bold:true,is_section_header:true});expect(result.current.sheet?.items.map(i=>i.order_index)).toEqual([0,1]);});

it('persists Undo rows with original IDs, rich content and formatting, and rejects failed restoration',async()=>{
 const {result}=renderHook(()=>useRunningSheet('event'));await waitFor(()=>expect(result.current.sheet).toBeTruthy());
 const snapshot=[{...api.items[0],sheet_id:'sheet',time_text:'6 PM',responsible:'MC',is_italic:true,is_underline:true}] as any;
 await act(async()=>{expect(await result.current.restoreItems(snapshot)).toMatchObject(snapshot)});
 expect(api.writes.find(w=>w.mode==='upsert').payload).toMatchObject(snapshot);
 api.fail=true;
 await act(async()=>{expect(await result.current.restoreItems(snapshot)).toBeNull()});
 expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Undo not saved'}));
});
