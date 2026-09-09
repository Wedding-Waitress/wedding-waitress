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
