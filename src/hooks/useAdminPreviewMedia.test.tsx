import {act,renderHook,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useAdminPreviewMedia} from './useAdminPreviewMedia';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
const response=(url='https://isolated.test/storage/v1/object/sign/reception-floor-plan-backgrounds/file?token=fixture')=>({data:{read_only:true,url,expires_at:new Date(Date.now()+600000).toISOString()},error:null});
beforeEach(()=>{mocks.invoke.mockReset();vi.stubEnv('VITE_SUPABASE_URL','https://isolated.test');sessionStorage.setItem('ww_admin_grant','fixture-grant');sessionStorage.setItem('ww_admin_grant_sig','fixture-signature');});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
it('does not request media outside an explicitly enabled customer preview',()=>{
 renderHook(()=>useAdminPreviewMedia(undefined,'event','reception_background',undefined,false));expect(mocks.invoke).not.toHaveBeenCalled();
});
it('requests only customer/event/record identity and fresh admin verification, not paths or customer sessions',async()=>{
 mocks.invoke.mockResolvedValue(response());const {result}=renderHook(()=>useAdminPreviewMedia('customer','event','reception_background',undefined,true));
 await waitFor(()=>expect(result.current.url).not.toBeNull());
 expect(mocks.invoke).toHaveBeenCalledWith('admin-customer-preview-media',{body:{customer_id:'customer',event_id:'event',kind:'reception_background',record_id:undefined,admin_grant:'fixture-grant',admin_grant_signature:'fixture-signature'}});
});
it.each(['https://tracking.example/file','https://isolated.test/dashboard','javascript:alert(1)'])('rejects unverified URL %s',async(url)=>{
 mocks.invoke.mockResolvedValue(response(url));const {result}=renderHook(()=>useAdminPreviewMedia('customer','event','reception_background',undefined,true));
 await waitFor(()=>expect(result.current.error).toBe(true));expect(result.current.url).toBeNull();
});
it('hides the previous customer asset immediately and ignores stale responses on target change',async()=>{
 mocks.invoke.mockResolvedValueOnce(response()).mockImplementation(()=>new Promise(()=>{}));
 const {result,rerender}=renderHook(({customer})=>useAdminPreviewMedia(customer,'event','reception_background',undefined,true),{initialProps:{customer:'first'}});
 await waitFor(()=>expect(result.current.url).not.toBeNull());
 await act(async()=>{rerender({customer:'second'});});expect(result.current.url).toBeNull();
});
it('times out and ignores a success arriving after the request deadline',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
 let resolve!:(value:ReturnType<typeof response>)=>void;
 mocks.invoke.mockImplementation(()=>new Promise(done=>{resolve=done;}));
 const {result}=renderHook(()=>useAdminPreviewMedia('customer','event','questionnaire_audio','audio',true));
 await act(async()=>{vi.advanceTimersByTime(10000);});
 expect(result.current).toMatchObject({url:null,error:true,loading:false});
 await act(async()=>{resolve(response());});
 expect(result.current).toMatchObject({url:null,error:true,loading:false});
});
it('removes an existing URL on focus and ignores the superseded refresh response',async()=>{
 mocks.invoke.mockResolvedValueOnce(response());
 const {result,unmount}=renderHook(()=>useAdminPreviewMedia('customer','event','reception_background',undefined,true));
 await waitFor(()=>expect(result.current.url).not.toBeNull());
 const pending:Array<(value:ReturnType<typeof response>)=>void>=[];
 mocks.invoke.mockImplementation(()=>new Promise(done=>{pending.push(done);}));
 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 expect(result.current.url).toBeNull();
 await act(async()=>{window.dispatchEvent(new Event('focus'));pending[0](response());});
 expect(result.current.url).toBeNull();
 await act(async()=>{pending[1](response());});
 expect(result.current.url).not.toBeNull();
 unmount();const calls=mocks.invoke.mock.calls.length;
 window.dispatchEvent(new Event('focus'));expect(mocks.invoke).toHaveBeenCalledTimes(calls);
});
