import {describe,it,expect,vi} from 'vitest';
import {cleanVideoWish,CLEANUP_AGE_MS} from '../../supabase/functions/_shared/video-wishes-cleanup';

const now=Date.parse('2026-09-21T00:00:00Z');
const job={item_id:'item',event_id:'event',processor_id:'temporary-copy',created_at:new Date(now-CLEANUP_AGE_MS-1).toISOString()};
function setup(status='pending'){
 const item={id:'item',event_id:'event',source_category:'video_wishes',storage_path:'event/item.mp4',upload_status:status};
 const deps={readItem:vi.fn().mockResolvedValue(item),claimIncomplete:vi.fn().mockResolvedValue(true),deleteProcessor:vi.fn().mockResolvedValue(undefined),deleteFile:vi.fn().mockResolvedValue(undefined),completeJob:vi.fn().mockResolvedValue(undefined)};
 return {item,deps};
}
describe('approved Video Wishes cleanup',()=>{
 it('removes an expired unfinished file only after claiming it',async()=>{const {deps}=setup();expect(await cleanVideoWish(job,deps,now)).toBe(true);expect(deps.deleteFile).toHaveBeenCalledWith('event/item.mp4');expect(deps.claimIncomplete.mock.invocationCallOrder[0]).toBeLessThan(deps.deleteFile.mock.invocationCallOrder[0]);});
 it('cleans failed uploads too',async()=>{const {deps}=setup('failed');expect(await cleanVideoWish(job,deps,now)).toBe(true);expect(deps.deleteFile).toHaveBeenCalledOnce();});
 it('keeps saved videos and only removes their temporary processor copy',async()=>{const {deps}=setup('uploaded');expect(await cleanVideoWish(job,deps,now)).toBe(true);expect(deps.claimIncomplete).not.toHaveBeenCalled();expect(deps.deleteFile).not.toHaveBeenCalled();expect(deps.deleteProcessor).toHaveBeenCalledWith('temporary-copy');});
 it('does not touch uploads at or below the two-hour threshold',async()=>{const {deps}=setup();expect(await cleanVideoWish({...job,created_at:new Date(now-CLEANUP_AGE_MS).toISOString()},deps,now)).toBe(false);expect(deps.readItem).not.toHaveBeenCalled();});
 it.each([{source_category:'gallery'},{event_id:'different-event'},{storage_path:'different-event/item.mp4'},{upload_status:'unknown'}])('does not delete outside the approved scope: %j',async patch=>{const {item,deps}=setup();Object.assign(item,patch);expect(await cleanVideoWish(job,deps,now)).toBe(false);expect(deps.deleteFile).not.toHaveBeenCalled();expect(deps.deleteProcessor).not.toHaveBeenCalled();});
 it('preserves a video when finalisation wins the race',async()=>{const {deps}=setup();deps.claimIncomplete.mockResolvedValue(false);expect(await cleanVideoWish(job,deps,now)).toBe(false);expect(deps.deleteFile).not.toHaveBeenCalled();expect(deps.deleteProcessor).not.toHaveBeenCalled();expect(deps.completeJob).not.toHaveBeenCalled();});
 it('leaves failed deletions retryable',async()=>{const {deps}=setup();deps.deleteFile.mockRejectedValue(new Error('storage down'));await expect(cleanVideoWish(job,deps,now)).rejects.toThrow('storage down');expect(deps.completeJob).not.toHaveBeenCalled();});
});
