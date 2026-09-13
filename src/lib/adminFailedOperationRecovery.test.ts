import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
const source=readFileSync('supabase/functions/admin-account-action/index.ts','utf8').replace(/^import .*$/gm,'');
async function fixture({email='owner@example.test',anonymous=false,exp:expiry=Date.now()+60_000,result='recovered'}={}){
 const rpc=vi.fn(async()=>({data:{result},error:null}));let handler!:(request:Request)=>Promise<Response>;
 const caller={auth:{getClaims:async()=>({data:{claims:{sub:'owner-id',email,is_anonymous:anonymous}},error:null})},rpc:async()=>({data:true})};
 const env:Record<string,string>={SUPABASE_URL:'https://isolated.test',SUPABASE_ANON_KEY:'anon-key',SUPABASE_SERVICE_ROLE_KEY:'service-key'};
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 new Function('Deno','createClient','Stripe','isOwnerAdminEmail','crypto',compiled)({serve:(fn:typeof handler)=>handler=fn,env:{get:(key:string)=>env[key]}},(_:string,key:string)=>key==='service-key'?{rpc}:caller,vi.fn(()=>{throw new Error('Recovery must not use Stripe');}),(value:string)=>value==='owner@example.test',webcrypto);
 const grant=btoa(JSON.stringify({user_id:'owner-id',exp:expiry}));const hash=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(`${grant}|service-key`));
 const body={action:'retry_failed_session_revocation',target_id:'failure-id',reason:'Owner reviewed the current account',reviewed_failure:true,admin_grant:grant,admin_grant_signature:Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')};
 const request=(value=body,auth=true)=>new Request('https://isolated.test',{method:'POST',headers:auth?{Authorization:'Bearer signed-owner-token'}:{},body:JSON.stringify(value)});
 return {handler,rpc,body,request};
}
describe('safe failed session-revocation recovery',()=>{
 it('uses the authoritative audit ID, authenticated owner and explicit review',async()=>{const a=await fixture();expect((await a.handler(a.request())).status).toBe(200);expect(a.rpc).toHaveBeenCalledWith('admin_retry_failed_session_revocation',{p_failure_audit_id:'failure-id',p_actor:'owner-id',p_reason:a.body.reason});});
 it('denies unauthenticated, ordinary, anonymous and expired owner requests before recovery',async()=>{for(const options of [{email:'customer@example.test'},{anonymous:true},{exp:Date.now()-1},{exp:NaN}]){const a=await fixture(options);expect((await a.handler(a.request())).status).toBe(403);expect(a.rpc).not.toHaveBeenCalled();}const a=await fixture();expect((await a.handler(a.request(a.body,false))).status).toBe(401);expect(a.rpc).not.toHaveBeenCalled();});
 it('denies unreviewed failures and never treats unsuccessful results as success',async()=>{const a=await fixture();expect((await a.handler(a.request({...a.body,reviewed_failure:false}))).status).toBe(400);expect(a.rpc).not.toHaveBeenCalled();const b=await fixture({result:'failed'});expect((await b.handler(b.request())).status).toBe(503);});
 it('accepts only the idempotent already-recovered response',async()=>{const a=await fixture({result:'already_recovered'});expect(await (await a.handler(a.request())).json()).toMatchObject({success:true,result:{result:'already_recovered'}});});
 it('locks audit and account state, restricts replay type and preserves evidence on rollback',()=>{
 const sql=readFileSync('supabase/migrations/20260912131707_admin_failed_session_revocation_recovery.sql','utf8');
 expect(sql).toContain("failure.action<>'blocked_account_session_revocation'");expect(sql).toContain('WHERE id=p_failure_audit_id FOR UPDATE');expect(sql).toContain('WHERE account_owner_id=target FOR UPDATE');expect(sql).toContain('failure_audit_id uuid PRIMARY KEY');expect(sql).toContain("'already_recovered'");expect(sql).toContain('FROM PUBLIC,anon,authenticated');expect(sql).not.toMatch(/stripe|email_queue|send_.*email/i);
 const rollback=readFileSync('supabase/rollbacks/20260912131707_admin_failed_session_revocation_recovery.rollback.sql','utf8');expect(rollback).not.toMatch(/DROP TABLE/i);
 });
});
