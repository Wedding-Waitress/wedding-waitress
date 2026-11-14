import{act,renderHook,waitFor}from'@testing-library/react';
import{beforeEach,expect,it,vi}from'vitest';
const db=vi.hoisted(()=>({read:vi.fn(),rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:()=>db.read()};return q;},rpc:db.rpc}}));
import{usePhotoCallout}from'./usePhotoCallout';
import{clearAllCaches,clearEventCaches}from'@/lib/cacheRegistry';
const plan=(event_id='one',revision=1)=>({event_id,revision,cards:[],private_notes:{note:'Synthetic private note'}});
const deferred=()=>{let resolve!:(v:any)=>void;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
beforeEach(()=>{clearAllCaches();vi.clearAllMocks();db.read.mockResolvedValue({data:plan(),error:null});});
it('shows a previously loaded plan immediately while checking for newer data',async()=>{
 const first=renderHook(()=>usePhotoCallout('one'));await waitFor(()=>expect(first.result.current.plan?.revision).toBe(1));first.unmount();
 const slow=deferred();db.read.mockReturnValue(slow.promise);const next=renderHook(()=>usePhotoCallout('one'));
 expect(next.result.current.plan?.revision).toBe(1);expect(next.result.current.loading).toBe(false);
 await act(async()=>slow.resolve({data:plan('one',2),error:null}));expect(next.result.current.plan?.revision).toBe(2);
});
it('coalesces simultaneous reads of the same event',async()=>{
 const slow=deferred();db.read.mockReturnValue(slow.promise);const a=renderHook(()=>usePhotoCallout('one'));const b=renderHook(()=>usePhotoCallout('one'));
 expect(db.read).toHaveBeenCalledOnce();await act(async()=>slow.resolve({data:plan(),error:null}));expect(a.result.current.plan).toEqual(b.result.current.plan);
});
it('never hydrates a different event or an account-cleared cache',async()=>{
 const first=renderHook(()=>usePhotoCallout('one'));await waitFor(()=>expect(first.result.current.plan).not.toBeNull());first.unmount();
 const slow=deferred();db.read.mockReturnValue(slow.promise);const other=renderHook(()=>usePhotoCallout('two'));expect(other.result.current.plan).toBeNull();other.unmount();
 clearAllCaches();const reset=renderHook(()=>usePhotoCallout('one'));expect(reset.result.current.plan).toBeNull();
 await act(async()=>slow.resolve({data:plan('two'),error:null}));
});
it('does not let an older refresh overwrite a successfully saved revision',async()=>{
 const first=renderHook(()=>usePhotoCallout('one'));await waitFor(()=>expect(first.result.current.plan).not.toBeNull());first.unmount();
 const slow=deferred();db.read.mockReturnValue(slow.promise);db.rpc.mockResolvedValue({data:plan('one',3),error:null});
 const current=renderHook(()=>usePhotoCallout('one'));await act(async()=>{expect(await current.result.current.save([])).toBe(true)});
 const another=renderHook(()=>usePhotoCallout('one'));
 await act(async()=>slow.resolve({data:plan('one',2),error:null}));expect(current.result.current.plan?.revision).toBe(3);expect(another.result.current.plan?.revision).toBe(3);
});
it('preserves cached content and reports a failed background refresh',async()=>{
 const first=renderHook(()=>usePhotoCallout('one'));await waitFor(()=>expect(first.result.current.plan).not.toBeNull());first.unmount();
 db.read.mockRejectedValue(Error('Unavailable'));const next=renderHook(()=>usePhotoCallout('one'));
 await waitFor(()=>expect(next.result.current.error).toBe('Unavailable'));expect(next.result.current.plan?.revision).toBe(1);expect(next.result.current.loading).toBe(false);
 next.unmount();clearEventCaches('one');const empty=renderHook(()=>usePhotoCallout('one'));expect(empty.result.current.plan).toBeNull();
});
it('does not let a delayed read repopulate an invalidated event cache',async()=>{
 const slow=deferred();db.read.mockReturnValueOnce(slow.promise);
 const current=renderHook(()=>usePhotoCallout('one'));clearEventCaches('one');
 await act(async()=>slow.resolve({data:plan(),error:null}));expect(current.result.current.plan).toBeNull();current.unmount();
 db.read.mockReturnValue(new Promise(()=>{}));const next=renderHook(()=>usePhotoCallout('one'));expect(next.result.current.plan).toBeNull();
});
