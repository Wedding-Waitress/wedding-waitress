import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
import { beforeEach,afterEach,expect,it,vi } from 'vitest';
import { verifyCleanupGrant } from '../../supabase/functions/_shared/designatedCleanupGrant';
const authored=readFileSync('supabase/functions/temporary-test-event-cleanup/index.ts','utf8');
const runnable=ts.transpileModule(authored.replace(/^import .*;\r?\n/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let handler:(req:Request)=>Promise<Response>;
let auth:ReturnType<typeof vi.fn>, ownerRpc:ReturnType<typeof vi.fn>, cleanupRpc:ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.stubGlobal('crypto',webcrypto);
  ownerRpc=vi.fn().mockResolvedValue({data:true,error:null});
  cleanupRpc=vi.fn().mockResolvedValue({data:[{removed:true}],error:null});
  auth=vi.fn().mockResolvedValue({user:{id:'owner',email:'verified-owner'},db:{rpc:cleanupRpc}});
  const deno={env:{get:(key:string)=>({SUPABASE_URL:'https://xytxkidpourwdbzzwcdp.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-secret',SUPABASE_ANON_KEY:'fixture-anon'}[key])},serve:(callback:typeof handler)=>{handler=callback;}};
  new Function('Deno','createClient','authenticatePromotionRequest','isOwnerAdminEmail','verifyCleanupGrant',runnable)(deno,()=>({rpc:ownerRpc}),auth,(email:string)=>email==='verified-owner',verifyCleanupGrant);
});
afterEach(()=>vi.unstubAllGlobals());
async function body(exp=Date.now()+60000) {
  const admin_grant=btoa(JSON.stringify({user_id:'owner',exp}));
  const digest=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(`${admin_grant}|fixture-secret`));
  return {confirmation:'DELETE ONLY EV-HNBFFYPF AND EV-5F9KDKDU',admin_grant,admin_grant_signature:Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')};
}
const request=(value:unknown)=>new Request('https://example.test/cleanup',{method:'POST',headers:{Authorization:'Bearer fixture-user-session','Content-Type':'application/json'},body:JSON.stringify(value)});
it('rejects unauthenticated/current-session failure without cleanup',async()=>{
  auth.mockRejectedValue(new Error('session revoked'));
  expect((await handler(request(await body()))).status).toBe(403);expect(cleanupRpc).not.toHaveBeenCalled();
});
it('rejects non-owner identities',async()=>{
  auth.mockResolvedValue({user:{id:'other',email:'other'},db:{rpc:cleanupRpc}});
  expect((await handler(request(await body()))).status).toBe(403);expect(cleanupRpc).not.toHaveBeenCalled();
});
it('rejects uncertain server owner authorization',async()=>{
  ownerRpc.mockResolvedValue({error:{message:'uncertain'},data:true});
  expect((await handler(request(await body()))).status).toBe(403);expect(cleanupRpc).not.toHaveBeenCalled();
});
it('rejects any supplied target override',async()=>{
  expect((await handler(request({...await body(),event_id:'unrelated'}))).status).toBe(400);expect(cleanupRpc).not.toHaveBeenCalled();
});
it('rejects wrong confirmation',async()=>{
  expect((await handler(request({...await body(),confirmation:'DELETE ALL'}))).status).toBe(400);expect(cleanupRpc).not.toHaveBeenCalled();
});
it('rejects expired signed grant before cleanup',async()=>{
  expect((await handler(request(await body(0)))).status).toBe(403);expect(cleanupRpc).not.toHaveBeenCalled();
});
it('never reports success for failed cleanup',async()=>{
  cleanupRpc.mockResolvedValue({error:{message:'denied'},data:null});
  const result=await handler(request(await body()));expect(result.status).toBe(409);expect((await result.json()).success).not.toBe(true);
});
it('calls only fixed RPC with verified actor after full authorization',async()=>{
  const result=await handler(request(await body()));expect(result.status).toBe(200);
  expect(cleanupRpc).toHaveBeenCalledExactlyOnceWith('temporary_cleanup_designated_test_events',{p_actor:'owner'});
});
