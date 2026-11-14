import {act,renderHook,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
const backend=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:backend.rpc,channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:vi.fn(),storage:{from:()=>({createSignedUrls:vi.fn().mockResolvedValue({data:[{signedUrl:'https://example.com/a.jpg'}],error:null})})}}}));
import {useEventMediaGallery} from './useEventMediaGallery';
import {clearAllCaches} from '@/lib/cacheRegistry';
const deferred=()=>{let resolve:any;const promise=new Promise<any>(r=>resolve=r);return{promise,resolve}};
const row=(event:string)=>({gallery_id:event,event_id:event,is_open:true});
beforeEach(()=>{clearAllCaches();backend.rpc.mockReset();backend.rpc.mockImplementation(async(name:string,args:any)=>({data:name==='get_event_media_gallery_host'?[row(args._event_id)]:[],error:null}));});
it('ignores a slow metadata response after selecting another event',async()=>{
 const slow=deferred();backend.rpc.mockImplementation(async(name:string,args:any)=>name==='get_event_media_gallery_host'&&args._event_id==='old'?slow.promise:{data:name==='get_event_media_gallery_host'?[row(args._event_id)]:[],error:null});
 const view=renderHook(({id})=>useEventMediaGallery(id,{loadItems:false}),{initialProps:{id:'old'}});
 view.rerender({id:'new'});await waitFor(()=>expect(view.result.current.meta?.gallery_id).toBe('new'));
 await act(async()=>slow.resolve({data:[row('old')],error:null}));expect(view.result.current.meta?.gallery_id).toBe('new');
});
it('does not expose previous-event metadata during the first switched render',async()=>{
 const seen:any[]=[];const slow=deferred();const view=renderHook(({id})=>{const value=useEventMediaGallery(id,{loadItems:false});seen.push({id,event:value.meta?.gallery_id});return value},{initialProps:{id:'old'}});
 await waitFor(()=>expect(view.result.current.meta?.gallery_id).toBe('old'));
 backend.rpc.mockReturnValue(slow.promise);view.rerender({id:'new'});expect(seen.filter(x=>x.id==='new').some(x=>x.event==='old')).toBe(false);
 await act(async()=>slow.resolve({data:[row('new')],error:null}));
});
it('does not show a failed old request as the current event error',async()=>{
 const slow=deferred();backend.rpc.mockImplementation(async(name:string,args:any)=>args._event_id==='old'?slow.promise:{data:[row('new')],error:null});
 const view=renderHook(({id})=>useEventMediaGallery(id,{loadItems:false}),{initialProps:{id:'old'}});view.rerender({id:'new'});await waitFor(()=>expect(view.result.current.meta?.gallery_id).toBe('new'));
 await act(async()=>slow.resolve({data:null,error:{message:'Old request failed'}}));expect(view.result.current.error).toBeNull();
});
it.each(['setOpen','updateLimits'] as const)('rejects backend errors from %s instead of reporting success',async(method)=>{
 const view=renderHook(()=>useEventMediaGallery('event',{loadItems:false}));await waitFor(()=>expect(view.result.current.meta).not.toBeNull());
 backend.rpc.mockResolvedValue({data:null,error:{message:'Permission denied'}});
 await act(async()=>{await expect(method==='setOpen'?view.result.current.setOpen(false):view.result.current.updateLimits({max_photos:100})).rejects.toThrow('Permission denied')});expect(view.result.current.meta?.is_open).toBe(true);
});
it('does not apply a completed old-event mutation to a newly selected event',async()=>{
 const view=renderHook(({id})=>useEventMediaGallery(id,{loadItems:false}),{initialProps:{id:'old'}});await waitFor(()=>expect(view.result.current.meta?.gallery_id).toBe('old'));
 const slow=deferred();backend.rpc.mockImplementation(async(name:string,args:any)=>name==='set_event_media_gallery_open'?slow.promise:{data:[row(args._event_id)],error:null});
 let pending:Promise<void>;act(()=>{pending=view.result.current.setOpen(false)});view.rerender({id:'new'});await waitFor(()=>expect(view.result.current.meta?.gallery_id).toBe('new'));
 await act(async()=>{slow.resolve({error:null});await pending});expect(view.result.current.meta?.is_open).toBe(true);
});

it('keeps the existing status if a same-status moderation request fails',async()=>{
 backend.rpc.mockImplementation(async(name:string,args:any)=>({data:name==='get_event_media_gallery_host'?[row(args._event_id)]:[{id:'item',storage_path:'a.jpg',moderation_status:'approved',source_category:'guest_upload'}],error:null}));
 const view=renderHook(()=>useEventMediaGallery('event'));await waitFor(()=>expect(view.result.current.items).toHaveLength(1));
 backend.rpc.mockResolvedValue({data:null,error:{message:'Denied'}});await act(async()=>{await expect(view.result.current.setModeration('item','approved')).rejects.toThrow('Denied')});expect(view.result.current.items[0].moderation_status).toBe('approved');
});

it('saves all Guestbook message modes atomically and restores the exact prior state on failure',async()=>{
 backend.rpc.mockImplementation(async(name:string,args:any)=>({data:name==='get_event_media_gallery_host'?[{...row(args._event_id),guestbook_text_enabled:true,video_guestbook_enabled:true}]:[],error:null}));
 const view=renderHook(()=>useEventMediaGallery('event',{loadItems:false}));await waitFor(()=>expect(view.result.current.meta?.guestbook_text_enabled).toBe(true));
 await act(async()=>view.result.current.setGuestbookEnabled(false));
 expect(backend.rpc).toHaveBeenCalledWith('set_event_media_digital_guestbook',{_event_id:'event',_enabled:false});
 expect(view.result.current.meta?.voice_guestbook_enabled).toBe(false);
 backend.rpc.mockRejectedValue(new Error('Connection failed'));
 await act(async()=>{await expect(view.result.current.setGuestbookEnabled(true)).rejects.toThrow('Connection failed')});
 expect(view.result.current.meta?.guestbook_text_enabled).toBe(false);expect(view.result.current.meta?.voice_guestbook_enabled).toBe(false);
});
