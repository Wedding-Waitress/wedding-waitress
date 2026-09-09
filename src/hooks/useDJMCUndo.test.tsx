import {act,renderHook,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {useDJMCUndo} from './useDJMCUndo';
const mocks=vi.hoisted(()=>({save:vi.fn(),read:vi.fn(),sign:vi.fn(),upload:vi.fn(),remove:vi.fn(),toast:vi.fn(),requests:vi.fn()}));
vi.mock('@/lib/djmcUndo',()=>({saveDJMCSnapshot:mocks.save,readDJMCSnapshot:mocks.read,restoreDJMCSongRequests:mocks.requests}));
vi.mock('@/lib/djmcPronunciationStorage',()=>({createDJMCPronunciationSignedUrl:mocks.sign,uploadDJMCPronunciation:mocks.upload,deleteDJMCPronunciation:mocks.remove}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mocks.toast})}));
const original:any=[{id:'section',questionnaire_id:'q',section_type:'ceremony',section_label:'Ceremony',section_subtitle:'Songs',notes:'Keep notes',is_collapsed:true,order_index:0,items:[{id:'item',section_id:'section',row_label:'Entrance',value_text:'Original text',song_title_artist:'Artist',music_url:'https://example.com/song',duration:'4',is_default:false,order_index:0,is_bold:true,is_italic:true,is_underline:true,is_section_header:true,pronunciation_audio_path:'old.webm'}]}];
let saved:any=[];
beforeEach(()=>{vi.clearAllMocks();saved=[];mocks.sign.mockResolvedValue('https://example.com/private-audio');vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(['sound'],{type:'audio/webm'})}));mocks.read.mockImplementation(async()=>structuredClone(saved));mocks.save.mockImplementation(async(_id,sections)=>{saved=structuredClone(sections);saved[0].items[0].pronunciation_audio_path=null;});mocks.upload.mockImplementation(async()=>{saved[0].items[0].pronunciation_audio_path='new.webm';return 'new.webm';});});
it('restores a deleted whole questionnaire with every field and its recording',async()=>{
 const refresh=vi.fn();const {result,rerender}=renderHook(({sections})=>useDJMCUndo({questionnaireId:'q',eventId:'event',sections,beforeRestore:async()=>{},refresh}),{initialProps:{sections:original}});
 const remove=vi.fn();await act(async()=>{await result.current.run(remove,true)});expect(remove).toHaveBeenCalled();expect(mocks.sign).toHaveBeenCalled();
 rerender({sections:[]});await act(async()=>{await result.current.undo()});
 expect(mocks.save).toHaveBeenCalledWith('q',original,undefined);expect(mocks.upload).toHaveBeenCalledWith(expect.any(Blob),{eventId:'event',itemId:'item',shareToken:undefined});expect(refresh).toHaveBeenCalled();expect(result.current.canUndo).toBe(false);
});
it('retains complete recovery when audio upload fails, then finishes on retry',async()=>{
 const {result,rerender}=renderHook(({sections})=>useDJMCUndo({questionnaireId:'q',eventId:'event',sections,beforeRestore:async()=>{},refresh:async()=>{}}),{initialProps:{sections:original}});
 await act(async()=>{await result.current.run(()=>{},true)});rerender({sections:[]});mocks.upload.mockRejectedValueOnce(new Error('offline'));
 await act(async()=>{await result.current.undo()});expect(result.current.canUndo).toBe(true);expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Undo not complete'}));
 await act(async()=>{await result.current.undo()});expect(result.current.canUndo).toBe(false);expect(saved[0].items[0].pronunciation_audio_path).toBe('new.webm');
});
it('does not delete anything when its recording cannot be backed up',async()=>{
 mocks.sign.mockRejectedValue(new Error('offline'));const remove=vi.fn();const {result}=renderHook(()=>useDJMCUndo({questionnaireId:'q',eventId:'event',sections:original,beforeRestore:async()=>{},refresh:async()=>{}}));
 await act(async()=>{await result.current.run(remove,true)});expect(remove).not.toHaveBeenCalled();expect(result.current.canUndo).toBe(false);
});
it('blocks view-only mutations and discards history on event changes',async()=>{
 const action=vi.fn();const {result,rerender}=renderHook(({canEdit,id})=>useDJMCUndo({questionnaireId:id,eventId:'event',sections:original,canEdit,beforeRestore:async()=>{},refresh:async()=>{}}),{initialProps:{canEdit:false,id:'q'}});
 await act(async()=>{await result.current.run(action,true);await result.current.undo()});expect(action).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
 rerender({canEdit:true,id:'q'});act(()=>{result.current.record(action)});expect(result.current.canUndo).toBe(true);rerender({canEdit:true,id:'other'});await waitFor(()=>expect(result.current.canUndo).toBe(false));
});

it('restores a deleted guest song request from the same top Undo control',async()=>{
 const requests:any=[{id:'request',event_id:'event',song_title:'Song',status:'approved'}];
 const {result}=renderHook(()=>useDJMCUndo({questionnaireId:'q',eventId:'event',sections:[],beforeRestore:async()=>{},refresh:async()=>{}}));
 mocks.save.mockImplementation(async()=>{saved=[];});
 await act(async()=>{await result.current.run(()=>{},false,requests)});
 await act(async()=>{await result.current.undo()});
 expect(mocks.requests).toHaveBeenCalledWith('event',requests);expect(result.current.canUndo).toBe(false);
});
