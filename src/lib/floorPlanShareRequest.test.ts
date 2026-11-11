import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},rpc:mocks.rpc}}));
import {requestFloorPlanShare} from './floorPlanShareRequest';
beforeEach(()=>vi.clearAllMocks());
it.each(['ceremony','reception'] as const)('coalesces concurrent %s entries but revalidates later visits',async kind=>{
 let resolve!: (v:any)=>void; mocks.invoke.mockImplementationOnce(()=>new Promise(r=>resolve=r));
 const token=kind==='ceremony'?'a'.repeat(64):'b'.repeat(64);
 const first=requestFloorPlanShare(token,kind), second=requestFloorPlanShare(token,kind);
 expect(first).toBe(second);expect(mocks.invoke).toHaveBeenCalledTimes(1);
 const payload={kind,permission:'view_only',plan:{id:'plan'},event:{name:'Event'}};
 resolve({data:payload,error:null});expect((await first).data).toEqual(payload);
 mocks.invoke.mockResolvedValueOnce({data:null,error:Error('Revoked')});
 expect((await requestFloorPlanShare(token,kind)).error).toBeTruthy();expect(mocks.invoke).toHaveBeenCalledTimes(2);
});
it('preserves the legacy reception RPC and catches transport failures',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:{plan:{}},error:null});
 await requestFloorPlanShare('legacy-token','reception');expect(mocks.rpc).toHaveBeenCalledWith('get_reception_floor_plan_by_share_token',{_token:'legacy-token'});
 mocks.invoke.mockRejectedValueOnce(Error('offline'));
 expect((await requestFloorPlanShare('c'.repeat(64),'ceremony')).error.message).toBe('offline');
});
