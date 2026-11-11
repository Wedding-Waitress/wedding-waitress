import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
const source=readFileSync('supabase/functions/purge-closed-accounts/index.ts','utf8').replace(/^import .*$/gm,'');
const id='00000000-0000-4000-8000-000000000002';
function fixture({owner=false,retained=false,storageError=false,listError=false,due=true,expired=true}={}){
 let handler!:(req:Request)=>Promise<Response>;
 const removed=vi.fn(async()=>({error:storageError?Error('private storage error'):null}));
 let profileRead=0;
 const list=vi.fn(async(bucket:string,prefix:string)=>{
  if(listError)return {data:null,error:Error('private listing error')};
  if(bucket==='profile-images'&&prefix===id&&profileRead++===0)return {data:[{id:'file',name:'portrait.jpg'}],error:null};
  return {data:[],error:null};
 });
 const rpc=vi.fn(async(name:string)=>({data:name==='get_due_account_purges'?(due?[{account_owner_id:id}]:[]):name==='is_admin_customer_retained'?retained:null,error:null}));
 const admin={rpc,auth:{admin:{getUserById:async()=>({data:{user:{email:owner?'owner@example.test':'customer@example.test'}},error:null})}},
  from:()=>({select:()=>({eq:()=>({single:async()=>({data:{status:'scheduled_for_deletion',purge_after:expired?'2020-01-01':'invalid',admin_deleted_at:null},error:null})})})}),
  storage:{from:(bucket:string)=>({list:(prefix:string)=>list(bucket,prefix),remove:removed})}};
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 new Function('Deno','createClient','isOwnerAdminEmail',compiled)({serve:(fn:typeof handler)=>handler=fn,env:{get:(key:string)=>({SUPABASE_SERVICE_ROLE_KEY:'service',SUPABASE_URL:'https://isolated.test',ACCOUNT_PURGE_PROCESSOR_SECRET:'a'.repeat(64)}[key])}},()=>admin,(email:string)=>email==='owner@example.test');
 const request=(body:unknown={},mode='service')=>new Request('https://isolated.test',{method:'POST',headers:mode==='service'?{Authorization:'Bearer service'}:mode==='scheduled'?{'x-account-purge-secret':'a'.repeat(64)}:{},body:JSON.stringify(body)});
 return {handler,request,rpc,list,removed};
}
describe('closed-account cleanup safeguards',()=>{
 it('denies callers without a service or dedicated processor credential',async()=>{const a=fixture();expect((await a.handler(a.request({},'none'))).status).toBe(401);expect(a.rpc).not.toHaveBeenCalled();});
 it('supports a read-only scheduler dry run',async()=>{const a=fixture();expect(await(await a.handler(a.request({dry_run:true},'scheduled'))).json()).toEqual({dry_run:true,eligible:1,processed:0,failed:0});expect(a.list).not.toHaveBeenCalled();expect(a.rpc).not.toHaveBeenCalledWith('complete_account_purge',expect.anything());});
 it('rejects malformed bodies, unexpected fields and targeted scheduler requests',async()=>{for(const body of [null,[],{unexpected:true},{account_owner_id:'invalid'},{dry_run:'yes'}]){const a=fixture();expect((await a.handler(a.request(body))).status).toBe(400);expect(a.rpc).not.toHaveBeenCalled();}const a=fixture();expect((await a.handler(a.request({account_owner_id:id},'scheduled'))).status).toBe(400);});
 it('preserves the platform owner and retained accounts before storage access',async()=>{for(const options of [{owner:true},{retained:true}]){const a=fixture(options);expect(await(await a.handler(a.request())).json()).toMatchObject({processed:0,failed:0});expect(a.list).not.toHaveBeenCalled();expect(a.rpc).not.toHaveBeenCalledWith('complete_account_purge',expect.anything());}});
 it('does not finalize deletion when storage listing or removal fails',async()=>{const log=vi.spyOn(console,'error').mockImplementation(()=>{});try{for(const options of [{storageError:true},{listError:true}]){const a=fixture(options);const response=await a.handler(a.request());expect(response.status).toBe(500);expect(await response.text()).not.toContain('private');expect(a.rpc).not.toHaveBeenCalledWith('complete_account_purge',expect.anything());}}finally{log.mockRestore();}});
 it('rejects invalid eligibility dates before storage removal',async()=>{const a=fixture({expired:false});expect(await(await a.handler(a.request())).json()).toMatchObject({processed:0});expect(a.list).not.toHaveBeenCalled();});
 it('finishes only after every storage prefix is confirmed empty',async()=>{const a=fixture();expect(await(await a.handler(a.request())).json()).toEqual({processed:1,failed:0});expect(a.removed).toHaveBeenCalledWith([id+'/portrait.jpg']);expect(a.list.mock.calls.filter(([bucket])=>bucket==='profile-images')).toHaveLength(2);expect(a.rpc).toHaveBeenCalledWith('complete_account_purge',{p_user_id:id,p_metadata:{storage_cleanup_attempted:true}});});
 it('returns no deletions when the eligible queue is empty',async()=>{const a=fixture({due:false});expect(await(await a.handler(a.request())).json()).toEqual({processed:0,failed:0});expect(a.list).not.toHaveBeenCalled();});
});
