import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {renderHook,act,waitFor} from '@testing-library/react';
import {DEFAULT_SECTION_TEMPLATES} from '@/lib/djMCQuestionnaireTemplates';
const api=vi.hoisted(()=>({reads:[] as string[],writes:[] as any[],toast:vi.fn(),delay:null as Promise<void>|null,persisted:null as any,q:{id:'q',event_id:'event'},sections:[{id:'s',questionnaire_id:'q',section_type:'main_event',order_index:0}],items:[{id:'i',section_id:'s',order_index:0,row_label:'Song',song_title_artist:'Existing song',is_bold:true}]}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 let mode='read',payload:any;const chain:any={select(){return chain},eq(){return chain},in(){return chain},order(){return chain},single(){return chain},maybeSingle(){return chain},update(value:any){mode='update';payload=value;return chain},insert(value:any){mode='insert';payload=value;return chain},then(resolve:any){if(mode!=='read')api.writes.push({table,mode,payload});else api.reads.push(table);const pause=mode==='update'?api.delay:null;if(pause)api.delay=null;return Promise.resolve(pause).then(()=>{if(mode==='update'&&payload.value_text!==undefined)api.persisted=payload.value_text;return {error:null,data:mode==='insert'?{id:'new',...payload}:table==='dj_mc_questionnaires'?api.q:table==='dj_mc_sections'?api.sections:table==='dj_mc_items'?api.items:[]}}).then(resolve)}};return chain},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:vi.fn()}}));
import {useDJMCQuestionnaire} from '@/hooks/useDJMCQuestionnaire';
beforeEach(()=>{api.writes.length=0;api.reads.length=0;api.delay=null;api.persisted=null;});
afterEach(()=>vi.useRealTimers());
describe('Questionnaire defaults and saving',()=>{
 it('includes all entrance songs before cake cutting for every new questionnaire',()=>{
 const main=DEFAULT_SECTION_TEMPLATES.find(s=>s.section_type==='main_event')!;
 expect(main.items.slice(0,5).map(i=>i.row_label)).toEqual(["Groom's Parents Introduction Song","Bride's Parents Introduction Song",'Bridal Party Entrance Song','Bride & Groom Entrance Song','Cake Cutting & Toast Song']);
 expect(DEFAULT_SECTION_TEMPLATES).toHaveLength(9);
 });
 it('saves edits to different fields in the same debounce window together',async()=>{
 const {result}=renderHook(()=>useDJMCQuestionnaire('event'));await waitFor(()=>expect(result.current.questionnaire?.sections).toHaveLength(1));
 act(()=>{result.current.updateItem('i',{music_url:'https://example.com/song'});result.current.updateItem('i',{song_title_artist:'New song'});result.current.updateSection('s',{notes:'Notes'});result.current.updateSection('s',{section_label:'Main songs'});});
 await waitFor(()=>expect(api.writes.filter(w=>w.mode==='update')).toHaveLength(2));
 expect(api.writes.find(w=>w.table==='dj_mc_items').payload).toEqual({music_url:'https://example.com/song',song_title_artist:'New song'});
 expect(api.writes.find(w=>w.table==='dj_mc_sections').payload).toEqual({notes:'Notes',section_label:'Main songs'});
 });
 it('copies the song title and formatting when duplicating a section',async()=>{
 const {result}=renderHook(()=>useDJMCQuestionnaire('event'));await waitFor(()=>expect(result.current.questionnaire?.sections).toHaveLength(1));
 await act(async()=>{await result.current.duplicateSection('s')});
 expect(api.writes.find(w=>w.table==='dj_mc_items'&&w.mode==='insert').payload[0]).toMatchObject({song_title_artist:'Existing song',is_bold:true});
 });
 it('loads nine sections with one item read and coalesces overlapping refreshes',async()=>{
  const originalSections=api.sections,originalItems=api.items;
  api.sections=Array.from({length:9},(_,index)=>({...originalSections[0],id:`s-${index}`,order_index:index}));
  api.items=api.sections.map((section,index)=>({...originalItems[0],id:`i-${index}`,section_id:section.id}));
  try {
   const {result}=renderHook(()=>useDJMCQuestionnaire('event'));
   await waitFor(()=>expect(result.current.questionnaire?.sections).toHaveLength(9));
   expect(api.reads.filter(table=>table==='dj_mc_items')).toHaveLength(1);
   expect(result.current.questionnaire?.sections.map(section=>section.items[0].section_id)).toEqual(api.sections.map(section=>section.id));
   await act(async()=>{await Promise.all([result.current.refetch(),result.current.refetch()]);});
   expect(api.reads.filter(table=>table==='dj_mc_items')).toHaveLength(2);
  } finally {api.sections=originalSections;api.items=originalItems;}
 });
});

it('updates text immediately and coalesces rapid Undo restores into the final autosave',async()=>{
 const h=renderHook(()=>useDJMCQuestionnaire('event'));await waitFor(()=>expect(h.result.current.questionnaire?.sections).toHaveLength(1));
 vi.useFakeTimers();const original=structuredClone(h.result.current.questionnaire!.sections);
 act(()=>{void h.result.current.updateItem('i',{value_text:'ABCDE'})});
 const reads=api.reads.length;
 for(const text of ['ABCD','ABC','AB','A','']){
  const next=structuredClone(h.result.current.questionnaire!.sections);next[0].items[0].value_text=text;
  act(()=>expect(h.result.current.restoreLocalTextUndo(next)).toBe(true));
  expect(h.result.current.questionnaire!.sections[0].items[0].value_text).toBe(text);expect(h.result.current.loading).toBe(false);
 }
 expect(api.writes).toHaveLength(0);expect(api.reads).toHaveLength(reads);
 await act(async()=>{await vi.advanceTimersByTimeAsync(300)});
 expect(api.writes).toEqual([{table:'dj_mc_items',mode:'update',payload:{value_text:''}}]);
});

it('shows rapid Undos before a slow old save resolves, then persists the newest value last',async()=>{
 const h=renderHook(()=>useDJMCQuestionnaire('event'));await waitFor(()=>expect(h.result.current.questionnaire?.sections).toHaveLength(1));vi.useFakeTimers();
 let release!:()=>void;api.delay=new Promise<void>(resolve=>release=resolve);
 act(()=>{void h.result.current.updateItem('i',{value_text:'ABCDE'})});await act(async()=>{await vi.advanceTimersByTimeAsync(300)});expect(api.writes).toHaveLength(1);
 for(const text of ['ABCD','ABC','AB','A','']){const rows=structuredClone(h.result.current.questionnaire!.sections);rows[0].items[0].value_text=text;act(()=>h.result.current.restoreLocalTextUndo(rows));expect(h.result.current.questionnaire!.sections[0].items[0].value_text).toBe(text);expect(h.result.current.loading).toBe(false);}
 await act(async()=>{await vi.advanceTimersByTimeAsync(300)});expect(api.writes).toHaveLength(1);expect(api.persisted).toBeNull();
 await act(async()=>{release();await Promise.resolve()});expect(api.writes).toHaveLength(2);expect(api.persisted).toBe('');
});
