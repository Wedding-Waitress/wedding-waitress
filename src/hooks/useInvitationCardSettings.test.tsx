import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({save:vi.fn(),toast:vi.fn(),clear:[] as Array<()=>void>}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:m.toast})}));
vi.mock('@/lib/cacheRegistry',()=>({registerCache:(f:()=>void)=>m.clear.push(f),registerEventCache:vi.fn()}));
vi.mock('@/lib/localWeddingFonts',()=>({resolveWeddingFontZones:(x:unknown)=>x}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({
  select:()=>({eq:()=>({order:async()=>({data:[{id:'one',event_id:'event',text_zones:[]},{id:'two',event_id:'event',text_zones:[]}],error:null})})}),
  update:(changes:unknown)=> {
    const values:Record<string,string>={};
    const query={eq:(key:string,value:string)=>{values[key]=value;return query},select:()=>query,single:()=>m.save(changes,values.id,values.event_id)};
    return query;
  }
})}}));
import {useInvitationCardSettings} from './useInvitationCardSettings';
beforeEach(()=>{m.clear.forEach(f=>f());vi.clearAllMocks();m.save.mockResolvedValue({data:{id:'one'},error:null})});
afterEach(()=>vi.useRealTimers());
async function loaded(){const h=renderHook(()=>useInvitationCardSettings('event'));await waitFor(()=>expect(h.result.current.activeArtworkId).toBe('one'));vi.useFakeTimers();return h;}
it('coalesces different settings without losing the first edit',async()=>{const h=await loaded();let a!:Promise<boolean>,b!:Promise<boolean>;act(()=>{a=h.result.current.updateSettings({background_color:'#abcdef'});b=h.result.current.updateSettings({background_image_opacity:30})});await act(async()=>{await vi.advanceTimersByTimeAsync(300)});expect(await a).toBe(true);expect(await b).toBe(true);expect(m.save).toHaveBeenCalledWith({background_color:'#abcdef',background_image_opacity:30},'one','event')});
it('flushes edits on unmount',async()=>{const h=await loaded();act(()=>{void h.result.current.updateSettings({background_color:'#123456'})});h.unmount();await act(async()=>{await Promise.resolve()});expect(m.save).toHaveBeenCalledWith({background_color:'#123456'},'one','event')});
it('keeps edits attached to their card when switching',async()=>{const h=await loaded();act(()=>{void h.result.current.updateSettings({background_color:'#111111'});h.result.current.setActiveArtwork('two')});act(()=>{void h.result.current.updateSettings({background_color:'#222222'})});await act(async()=>{await vi.advanceTimersByTimeAsync(300)});expect(m.save).toHaveBeenNthCalledWith(1,{background_color:'#111111'},'one','event');expect(m.save).toHaveBeenNthCalledWith(2,{background_color:'#222222'},'two','event')});
it('returns failure when the database rejects a save',async()=>{const h=await loaded();m.save.mockResolvedValueOnce({error:new Error('rejected')});let saved!:Promise<boolean>;act(()=>{saved=h.result.current.updateSettings({background_color:'#111111'})});await act(async()=>{await vi.advanceTimersByTimeAsync(300)});expect(await saved).toBe(false);expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({variant:'destructive'}))});
it('serializes writes so older requests cannot overwrite newer ones',async()=>{const h=await loaded();let release!:(x:unknown)=>void;m.save.mockImplementationOnce(()=>new Promise(r=>release=r));act(()=>{void h.result.current.updateSettings({background_color:'#111111'})});await act(async()=>{await vi.advanceTimersByTimeAsync(300)});act(()=>{void h.result.current.updateSettings({background_color:'#222222'})});await act(async()=>{await vi.advanceTimersByTimeAsync(300)});expect(m.save).toHaveBeenCalledTimes(1);await act(async()=>{release({data:{id:'one'},error:null});await Promise.resolve()});expect(m.save).toHaveBeenCalledTimes(2)});

it('restores deleted zones with exact geometry, branches redo, and isolates artwork history',async()=>{
 const h=await loaded();const zone:any={id:'zone',text:'YOUR SEAT',font_size:47,font_color:'#332211',x_percent:32,y_percent:64,width_percent:70,rotation:12};
 act(()=>{void h.result.current.updateSettings({text_zones:[zone]})});
 act(()=>{void h.result.current.updateSettings({text_zones:[]})});
 expect(h.result.current.canUndo).toBe(true);
 act(()=>{void h.result.current.undo()});expect(h.result.current.activeArtwork?.text_zones).toEqual([zone]);expect(h.result.current.canRedo).toBe(true);
 act(()=>{h.result.current.setActiveArtwork('two')});expect(h.result.current.canUndo).toBe(false);expect(h.result.current.canRedo).toBe(false);
 act(()=>{void h.result.current.undo()});expect(h.result.current.activeArtwork?.text_zones).toEqual([]);
 act(()=>{h.result.current.setActiveArtwork('one')});expect(h.result.current.canRedo).toBe(true);
 act(()=>{void h.result.current.redo()});expect(h.result.current.activeArtwork?.text_zones).toEqual([]);
 act(()=>{void h.result.current.undo()});act(()=>{void h.result.current.updateSettings({background_color:'#ff0000'})});expect(h.result.current.canRedo).toBe(false);
 await act(async()=>{await vi.advanceTimersByTimeAsync(300)});
 expect(m.save).toHaveBeenLastCalledWith(expect.objectContaining({background_color:'#ff0000',text_zones:[zone]}),'one','event');
});
it('keeps repeated preview gestures as separate complete actions',async()=>{
 const h=await loaded();
 act(()=>{void h.result.current.updateSettings({background_image_opacity:20},{historyGroup:false})});
 act(()=>{void h.result.current.updateSettings({background_image_opacity:40},{historyGroup:false})});
 act(()=>{void h.result.current.undo()});expect(h.result.current.activeArtwork?.background_image_opacity).toBe(20);
 act(()=>{void h.result.current.redo()});expect(h.result.current.activeArtwork?.background_image_opacity).toBe(40);
});

it('does not expose or undo a previous event artwork during event loading',async()=>{
 const h=renderHook(({event})=>useInvitationCardSettings(event),{initialProps:{event:'event'}});
 await waitFor(()=>expect(h.result.current.activeArtworkId).toBe('one'));
 act(()=>{void h.result.current.updateSettings({background_color:'#123456'})});expect(h.result.current.canUndo).toBe(true);
 h.rerender({event:'other'});expect(h.result.current.activeArtwork).toBeNull();expect(h.result.current.canUndo).toBe(false);
 await act(async()=>{expect(await h.result.current.undo()).toBe(false)});
});
