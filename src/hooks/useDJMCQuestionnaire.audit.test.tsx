import {describe,it,expect,vi,beforeEach} from 'vitest';
import {renderHook,act,waitFor} from '@testing-library/react';
import {DEFAULT_SECTION_TEMPLATES} from '@/lib/djMCQuestionnaireTemplates';
const api=vi.hoisted(()=>({writes:[] as any[],toast:vi.fn(),q:{id:'q',event_id:'event'},sections:[{id:'s',questionnaire_id:'q',section_type:'main_event',order_index:0}],items:[{id:'i',section_id:'s',order_index:0,row_label:'Song',song_title_artist:'Existing song',is_bold:true}]}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 let mode='read',payload:any;const chain:any={select(){return chain},eq(){return chain},order(){return chain},single(){return chain},maybeSingle(){return chain},update(value:any){mode='update';payload=value;return chain},insert(value:any){mode='insert';payload=value;return chain},then(resolve:any){if(mode!=='read')api.writes.push({table,mode,payload});return Promise.resolve({error:null,data:mode==='insert'?{id:'new',...payload}:table==='dj_mc_questionnaires'?api.q:table==='dj_mc_sections'?api.sections:table==='dj_mc_items'?api.items:[]}).then(resolve)}};return chain},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:vi.fn()}}));
import {useDJMCQuestionnaire} from '@/hooks/useDJMCQuestionnaire';
beforeEach(()=>{api.writes.length=0;});
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
});
