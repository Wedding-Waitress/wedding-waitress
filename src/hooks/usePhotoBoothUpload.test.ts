import {act,renderHook} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const backend=vi.hoisted(()=>({rpc:vi.fn(),transfer:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:backend.rpc,storage:{from:()=>({upload:backend.transfer})}}}));
import {usePhotoBoothUpload} from './usePhotoBoothUpload';
const opts={token:'event-token',mime:'image/jpeg',uploaderName:'Guest',filename:'session-photo-1.jpg',isStrip:false};
const row={item_id:'item',storage_path:'correct-event/photobooth/item.jpg',upload_token:'item-secret'};
beforeEach(()=>{backend.transfer.mockReset().mockResolvedValue({error:null});backend.rpc.mockReset().mockImplementation(async(name:string)=>name==='register_event_photobooth_upload'?{data:[row]}:{data:true});});
describe('existing Photo Booth registration/storage/finalization retry',()=>{
 it('keeps the same item after a lost finalize response, without retransferring or registering again',async()=>{
  let finalized=0;
  backend.rpc.mockImplementation(async(name:string)=>name==='register_event_photobooth_upload'?{data:[row]}:++finalized===1?{error:{message:'network'}}:{data:true});
  const {result}=renderHook(()=>usePhotoBoothUpload());const blob=new Blob(['original']);
  await act(async()=>{expect(await result.current.upload(blob,opts)).toBe(false);});
  await act(async()=>{expect(await result.current.upload(blob,opts)).toBe(true);});
  expect(backend.rpc.mock.calls.filter(c=>c[0]==='register_event_photobooth_upload')).toHaveLength(1);
  expect(backend.rpc.mock.calls.filter(c=>c[0]==='finalize_event_media_upload')).toHaveLength(2);
  expect(backend.rpc).not.toHaveBeenCalledWith('fail_event_media_upload',expect.anything());
  expect(backend.transfer).toHaveBeenCalledTimes(1);
  expect(backend.transfer).toHaveBeenCalledWith(row.storage_path,blob,{contentType:'image/jpeg',upsert:false});
  await act(async()=>{expect(await result.current.upload(blob,opts)).toBe(true);});
  expect(backend.transfer).toHaveBeenCalledTimes(1);
 });
 it('recovers an ambiguous transfer with the existing reservation and a duplicate-object response',async()=>{
  backend.transfer.mockResolvedValueOnce({error:{message:'network'}}).mockResolvedValueOnce({error:{message:'The resource already exists',statusCode:'409'}});
  const {result}=renderHook(()=>usePhotoBoothUpload());const blob=new Blob(['original']);
  await act(async()=>{expect(await result.current.upload(blob,opts)).toBe(false);});
  await act(async()=>{expect(await result.current.upload(blob,opts)).toBe(true);});
  expect(backend.rpc.mock.calls.filter(c=>c[0]==='register_event_photobooth_upload')).toHaveLength(1);
  expect(backend.transfer.mock.calls.map(c=>c[0])).toEqual([row.storage_path,row.storage_path]);
 });
 it('coalesces concurrent calls for the same output and never reports another output saved',async()=>{
  let release!:(value:any)=>void;backend.transfer.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
  const {result}=renderHook(()=>usePhotoBoothUpload());const blob=new Blob(['original']);
  let first!:Promise<boolean>;let second!:Promise<boolean>;
  await act(async()=>{first=result.current.upload(blob,opts);second=result.current.upload(blob,opts);});
  expect(first).toBe(second);
  await act(async()=>{expect(await result.current.upload(new Blob(['other']),{...opts,filename:'photo-2.jpg'})).toBe(false);release({error:null});expect(await first).toBe(true);});
  expect(backend.transfer).toHaveBeenCalledTimes(1);
 });
 it('requires a true finalize acknowledgement and reports a denied registration without transfer',async()=>{
  const {result}=renderHook(()=>usePhotoBoothUpload());
  backend.rpc.mockResolvedValueOnce({error:{message:'Gallery is closed'}});
  await act(async()=>{expect(await result.current.upload(new Blob(['x']),opts)).toBe(false);});
  expect(backend.transfer).not.toHaveBeenCalled();expect(result.current.error).toBe('Gallery is closed');
  backend.rpc.mockResolvedValueOnce({data:[row]}).mockResolvedValueOnce({data:false});
  await act(async()=>{expect(await result.current.upload(new Blob(['x']),opts)).toBe(false);});
 });
});
