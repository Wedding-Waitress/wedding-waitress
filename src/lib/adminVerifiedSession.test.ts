import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { hasRecentAdminVerification } from '../../supabase/functions/_shared/adminVerifiedSession';

const helper=readFileSync('supabase/functions/_shared/adminVerifiedSession.ts','utf8').replace('export async function','async function');
const source=(name:string)=>(name==='admin-operations-snapshot'?readFileSync('supabase/functions/_shared/adminOperationalPagination.ts','utf8').replace(/^export type.*$/gm,'').replaceAll('export ','')+'\n':'')+readFileSync(`supabase/functions/${name}/index.ts`,'utf8').replace(/^import .*$/gm,'');
const compile=(text:string)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const owner='00000000-0000-4000-8000-000000000001',session='00000000-0000-4000-8000-000000000003';
const env:Record<string,string>={SUPABASE_URL:'https://isolated.test',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'};
const request=()=>new Request('https://isolated.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({code:'123456'})});

describe('server verification on every Admin Centre endpoint',()=>{
 it.each(['admin-promotions','admin-operations-snapshot','admin-customer-preview-media','admin-customer-preview-billing','admin-payment-refund','admin-account-action','admin-manage-subscription'])('%s denies unverified sessions before elevated access',async name=>{
  for(const mode of ['missing','error','throw']){
   const rpc=vi.fn(async(name:string)=>{if(name==='is_owner_admin')return {data:true,error:null};if(mode==='throw')throw Error('offline');return {data:false,error:mode==='error'?Error('expired'):null};});
   const caller={rpc,auth:{getClaims:async()=>({data:{claims:{sub:owner,email:'owner@example.test',session_id:session}},error:null}),getUser:async()=>({data:{user:{id:owner,email:'owner@example.test',is_anonymous:false}},error:null})}};
   const elevated=vi.fn();const createClient=(_:string,key:string)=>{if(key==='service'){elevated();throw Error('Must not elevate');}return caller;};
   let handler!:(request:Request)=>Promise<Response>;
   new Function('Deno','createClient','isOwnerAdminEmail','authenticatePromotionRequest','crypto',compile(helper+'\n'+source(name)))({env:{get:(key:string)=>env[key]},serve:(fn:typeof handler)=>handler=fn},createClient,()=>true,async()=>({user:{id:owner,email:'owner@example.test'}}),webcrypto);
   const response=await handler(request());expect(response.status).toBe(403);expect(await response.json()).toMatchObject({error:expect.stringMatching(/Recent administrator verification/)});expect(rpc).toHaveBeenCalledWith('admin_require_verified_session');expect(elevated).not.toHaveBeenCalled();
  }
 });
 it('accepts only an explicit successful proof',async()=>{
  for(const data of [null,false,'true',{},[]])expect(await hasRecentAdminVerification({rpc:async()=>({data,error:null})})).toBe(false);
  expect(await hasRecentAdminVerification({rpc:async()=>({data:true,error:null})})).toBe(true);
 });
});

describe('OTP transaction and signed grant binding',()=>{
 async function fixture(result:unknown,error:unknown=null,sessionId:unknown=session){
  const rpc=vi.fn(async()=>({data:result,error}));let handler!:(request:Request)=>Promise<Response>;
  const createClient=(_:string,key:string)=>key==='service'?{rpc}:{auth:{getClaims:async()=>({data:{claims:{sub:owner,email:'owner@example.test',session_id:sessionId}},error:null})},rpc:async()=>({data:true,error:null})};
  new Function('Deno','createClient','isOwnerAdminEmail','crypto',compile(source('admin-verify-otp')))({env:{get:(key:string)=>env[key]},serve:(fn:typeof handler)=>handler=fn},createClient,()=>true,webcrypto);
  return {handler,rpc};
 }
 it('issues a signed grant only for the committed session and expiry',async()=>{
  const expires_at=new Date(Date.now()+600000).toISOString();const a=await fixture({result:'verified',expires_at});const response=await a.handler(request());expect(response.status).toBe(200);const body=await response.json();expect(JSON.parse(atob(body.grant))).toEqual({user_id:owner,session_id:session,exp:Date.parse(expires_at)});expect(a.rpc).toHaveBeenCalledWith('consume_admin_verification_code',{p_user:owner,p_session:session,p_code_hash:expect.stringMatching(/^[a-f0-9]{64}$/)});const hash=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(body.grant+'|service'));expect(body.signature).toBe(Buffer.from(hash).toString('hex'));
 });
 it.each(['invalid_code','expired','no_active_code','too_many_attempts'])('never signs %s',async result=>{const a=await fixture({result});const response=await a.handler(request());expect([400,429]).toContain(response.status);expect(await response.json()).not.toHaveProperty('grant');});
 it('fails closed on transaction failure and missing or invalid login sessions',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  try{const a=await fixture(null,Error('private database failure'));expect((await a.handler(request())).status).toBe(503);for(const sessionId of [null,'forged']){const b=await fixture({result:'verified'},null,sessionId);expect((await b.handler(request())).status).toBe(401);expect(b.rpc).not.toHaveBeenCalled();}}finally{log.mockRestore();}
 });
});
