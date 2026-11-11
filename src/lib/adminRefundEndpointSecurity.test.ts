import {beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',session='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function fixture(options:any={}){
 const claims={sub:actor,email:'owner@example.test',session_id:session,...options.claims};
 const caller={auth:{getClaims:vi.fn(async()=>({data:{claims},error:null}))},rpc:vi.fn(async()=>({data:options.owner!==false,error:null}))};
 const audit=vi.fn(async()=>({error:options.auditError?{}:null}));
 const admin={from:vi.fn(()=>({insert:audit}))};
 const history=vi.fn(async()=>({success:true,customer_id:actor,records:[],next_cursor:null}));
 const provider=vi.fn(),recent=vi.fn(async()=>options.recent!==false);
 let handler:any;
 const source=fs.readFileSync('supabase/functions/admin-payment-refund/index.ts','utf8').replace(/^import .*$/gm,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 new Function('readCustomerRefundHistory','hasRecentAdminVerification','createClient','Stripe','isOwnerAdminEmail','resolveRefundPayment','submitRefund','reconcileRefund','Deno','crypto','console',compiled)(
  history,recent,(_url:any,key:any)=>key==='service-test'?admin:caller,provider,()=>options.ownerEmail!==false,vi.fn(),vi.fn(),vi.fn(),
  {env:{get:(name:string)=>({SUPABASE_URL:'https://isolated.test',SUPABASE_ANON_KEY:'anon-test',SUPABASE_SERVICE_ROLE_KEY:'service-test'}[name])},serve:(fn:any)=>{handler=fn;}},webcrypto,{error:vi.fn()});
 async function request(change:any={},badSignature=false,authorization=true){
  const grant=btoa(JSON.stringify({user_id:actor,session_id:session,exp:Date.now()+60000,...change}));
  const hash=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(grant+'|service-test'));
  const signature=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
  return handler(new Request('https://isolated.test',{method:'POST',headers:{'content-type':'application/json',...(authorization?{authorization:'Bearer user-test'}:{})},
   body:JSON.stringify({action:'customer_history',customer_id:actor,admin_grant:grant,admin_grant_signature:badSignature?'0'.repeat(64):signature})}));
 }
 return{request,history,audit,provider};
}
describe('refund endpoint owner/session boundary',()=>{
 it('permits audited read-only customer history while refund actions and credentials are off',async()=>{
  const f=fixture();expect((await f.request()).status).toBe(200);expect(f.history).toHaveBeenCalledOnce();expect(f.audit).toHaveBeenCalledOnce();expect(f.provider).not.toHaveBeenCalled();
 });
 it.each([{owner:false},{ownerEmail:false},{recent:false},{claims:{is_anonymous:true}}])('rejects unverified or unauthorized owners %j',async options=>{
  const f=fixture(options);expect((await f.request()).status).toBe(403);expect(f.history).not.toHaveBeenCalled();
 });
 it('rejects unauthenticated requests',async()=>{const f=fixture();expect((await f.request({},false,false)).status).toBe(401);expect(f.history).not.toHaveBeenCalled();});
 it.each([{user_id:'foreign'},{session_id:'foreign'},{session_id:''},{exp:0},{exp:'9999999999999'},{exp:null}])('rejects invalid signed grants %j',async change=>{
  const f=fixture();expect((await f.request(change)).status).toBe(403);expect(f.history).not.toHaveBeenCalled();
 });
 it('rejects incorrect signatures before reading customer records',async()=>{const f=fixture();expect((await f.request({},true)).status).toBe(403);expect(f.history).not.toHaveBeenCalled();});
 it('fails closed when financial-history access cannot be audited',async()=>{const f=fixture({auditError:true});expect((await f.request()).status).toBe(503);});
});
