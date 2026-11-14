import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {expect,it,vi} from 'vitest';
const actor='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
async function fixture(options:{recent?:boolean;owner?:boolean;ownerEmail?:boolean;rpcError?:boolean}={}){
 let handler!:(req:Request)=>Promise<Response>;
 const rpc=vi.fn(async()=>({data:{id,active:false,deleted_at:'2026-10-30'},error:options.rpcError?{}:null}));
 const source=readFileSync('supabase/functions/admin-promotions/index.ts','utf8').replace(/^import .*$/gm,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const caller={rpc:async()=>({data:options.owner!==false,error:null})};
 new Function('Deno','createClient','hasRecentAdminVerification','isOwnerAdminEmail','authenticatePromotionRequest','crypto',compiled)(
  {serve:(fn:typeof handler)=>handler=fn,env:{get:(name:string)=>({SUPABASE_URL:'https://fixture.test',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'}[name])}},
  (_url:string,key:string)=>key==='service'?{rpc}:caller,async()=>options.recent!==false,()=>options.ownerEmail!==false,async()=>({user:{id:actor,email:'owner@example.test'}}),webcrypto);
 const request=async(patch:Record<string,unknown>={},grantPatch:Record<string,unknown>={},auth=true)=>{
  const grant=btoa(JSON.stringify({user_id:actor,exp:Date.now()+60000,...grantPatch}));
  const signature=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(`${grant}|service`))).toString('hex');
  return handler(new Request('https://fixture.test',{method:'POST',headers:auth?{Authorization:'Bearer fixture'}:{},body:JSON.stringify({action:'delete',id,admin_grant:grant,admin_grant_signature:signature,...patch})}));
 };
 return {request,rpc};
}
it('delegates deletion with the authenticated actor and only the validated campaign id',async()=>{
 const f=await fixture();expect((await f.request({active:true,p_actor:'foreign'})).status).toBe(200);
 expect(f.rpc).toHaveBeenCalledExactlyOnceWith('admin_manage_promotion',{p_actor:actor,p_action:'delete',p_payload:{id}});
});
it.each([{recent:false},{owner:false},{ownerEmail:false}])('requires owner authorization and recent verification %j',async options=>{
 const f=await fixture(options);expect((await f.request()).status).toBe(403);expect(f.rpc).not.toHaveBeenCalled();
});
it('requires authentication, valid signed grants, matching identity and unexpired verification',async()=>{
 const f=await fixture();expect((await f.request({}, {},false)).status).toBe(401);
 for(const grant of [{user_id:'foreign'},{exp:0},{exp:'future'}])expect((await f.request({},grant)).status).toBe(403);
 expect((await f.request({admin_grant_signature:'forged'})).status).toBe(403);expect(f.rpc).not.toHaveBeenCalled();
});
it.each([null,'missing','------------------------------------'])('rejects invalid campaign ids %j',async id=>{
 const f=await fixture();expect((await f.request({id})).status).toBe(400);expect(f.rpc).not.toHaveBeenCalled();
});
it('does not report success if the database rejects deletion',async()=>{
 const f=await fixture({rpcError:true});const result=await f.request();expect(result.status).toBe(503);expect(await result.json()).not.toHaveProperty('success',true);
});
