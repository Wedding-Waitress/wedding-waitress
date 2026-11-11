import {beforeEach,describe,it,expect,vi} from 'vitest';
import type {GuidedSetupDraft} from './guidedEventSetup';
const m=vi.hoisted(()=>({rpc:vi.fn(),download:vi.fn(),upload:vi.fn(),from:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:m.rpc,storage:{from:m.from}}}));
import{seedOnboardingProfileImage}from'./onboardingProfileImage';
const draft=():GuidedSetupDraft=>({id:'draft-1',user_id:'owner-1',mode:'first_event',answers:{eventImagePath:'owner-1/drafts/draft-1/photo.jpg'},current_step:9,created_event_id:'event-1',completed_at:null,creation_started_at:null,created_at:'',updated_at:''});
const result=(status:string,extra={})=>({data:{status,...extra},error:null});
const required=()=>result('copy_required',{source_path:'owner-1/drafts/draft-1/photo.jpg',target_path:'owner-1/profile-image'});
beforeEach(()=>{vi.resetAllMocks();m.from.mockImplementation((bucket:string)=>{if(bucket==='event-branding')return{download:m.download};if(bucket==='profile-images')return{upload:m.upload};throw Error('Unexpected bucket');});m.download.mockResolvedValue({data:new Blob(['photo'],{type:'image/jpeg'}),error:null});m.upload.mockResolvedValue({error:null});});
describe('first onboarding private profile photo handoff',()=>{
 it('copies bytes into an independent private object and never overwrites or removes the event file',async()=>{
  m.rpc.mockResolvedValueOnce(required()).mockResolvedValueOnce(result('seeded'));await seedOnboardingProfileImage(draft());
  expect(m.download).toHaveBeenCalledWith('owner-1/drafts/draft-1/photo.jpg');expect(m.upload).toHaveBeenCalledWith('owner-1/profile-image',expect.any(Blob),expect.objectContaining({upsert:false,metadata:{onboarding_draft_id:'draft-1',source_path:'owner-1/drafts/draft-1/photo.jpg'}}));expect(m.from.mock.calls.map(c=>c[0])).toEqual(['event-branding','profile-images']);
 });
 it.each(['additional','no photo','completed'])('skips %s without touching profile or storage',async(kind)=>{
  const d=draft();if(kind==='additional')d.mode='additional_event';if(kind==='no photo')d.answers={};if(kind==='completed')d.completed_at='2026-10-31';await seedOnboardingProfileImage(d);expect(m.rpc).not.toHaveBeenCalled();expect(m.from).not.toHaveBeenCalled();
 });
 it.each(['preserved','skipped'])('respects an existing/private or previously resolved decision: %s',async(status)=>{
  m.rpc.mockResolvedValue(result(status));await seedOnboardingProfileImage(draft());expect(m.from).not.toHaveBeenCalled();
 });
 it('retries a download failure without losing the source photo',async()=>{
  m.rpc.mockResolvedValue(required());m.download.mockResolvedValueOnce({data:null,error:Error('Download unavailable')});await expect(seedOnboardingProfileImage(draft())).rejects.toThrow('Download unavailable');expect(m.upload).not.toHaveBeenCalled();m.rpc.mockReset().mockResolvedValueOnce(required()).mockResolvedValueOnce(result('seeded'));await seedOnboardingProfileImage(draft());expect(m.upload).toHaveBeenCalledTimes(1);
 });
 it('accepts a committed copy when the upload response was lost',async()=>{
  m.rpc.mockResolvedValueOnce(required()).mockResolvedValueOnce(result('seeded'));m.upload.mockResolvedValue({error:Error('Network response lost')});await expect(seedOnboardingProfileImage(draft())).resolves.toBeUndefined();
 });
 it('preserves a simultaneous explicit profile upload',async()=>{
  m.rpc.mockResolvedValueOnce(required()).mockResolvedValueOnce(result('preserved'));m.upload.mockResolvedValue({error:{statusCode:409}});await expect(seedOnboardingProfileImage(draft())).resolves.toBeUndefined();expect(m.upload.mock.calls[0][2].upsert).toBe(false);
 });
 it('surfaces real copy failure and can resume after database finalization failure',async()=>{
  m.rpc.mockResolvedValueOnce(required()).mockResolvedValueOnce(required());m.upload.mockResolvedValue({error:Error('Upload unavailable')});await expect(seedOnboardingProfileImage(draft())).rejects.toThrow('Upload unavailable');
  m.rpc.mockReset().mockResolvedValueOnce(required()).mockResolvedValueOnce({data:null,error:Error('Finalize unavailable')});m.upload.mockResolvedValue({error:null});await expect(seedOnboardingProfileImage(draft())).rejects.toThrow('Finalize unavailable');
  m.rpc.mockReset().mockResolvedValueOnce(result('seeded'));m.upload.mockClear();await seedOnboardingProfileImage(draft());expect(m.upload).not.toHaveBeenCalled();
 });
 it('refuses a mismatched source/target and malformed RPC result',async()=>{
  m.rpc.mockResolvedValueOnce(result('copy_required',{source_path:'other/private.jpg',target_path:'owner-1/profile-image'}));await expect(seedOnboardingProfileImage(draft())).rejects.toThrow('ownership');expect(m.from).not.toHaveBeenCalled();m.rpc.mockResolvedValueOnce({data:null,error:null});await expect(seedOnboardingProfileImage(draft())).rejects.toThrow('verified');
 });
});
