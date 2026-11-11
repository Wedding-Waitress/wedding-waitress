import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
const paginationSource=readFileSync('supabase/functions/_shared/adminOperationalPagination.ts','utf8').replace(/^export type.*$/gm,'').replaceAll('export ','');
const handlerSource=paginationSource+'\n'+(readFileSync('supabase/functions/_shared/adminVerifiedSession.ts','utf8').replace('export async function','async function')+'\n'+readFileSync('supabase/functions/admin-operations-snapshot/index.ts', 'utf8')).replace(/^import .*$/gm,'');
function app(email:string,owner=true){
  let handler:(req:Request)=>Promise<Response>;
  const read=vi.fn();
  const user={auth:{getClaims:vi.fn(async()=>({data:{claims:{email,sub:'owner-id'}},error:null}))},rpc:vi.fn(async()=>({data:owner}))};
  const client=vi.fn((_:string,key:string)=>key==='service-key'?{from:read}:user);
  const env:Record<string,string>={SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'anon-key',SUPABASE_SERVICE_ROLE_KEY:'service-key'};
  const compiled=ts.transpileModule(handlerSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  new Function('Deno','createClient','isOwnerAdminEmail','crypto',compiled)({serve:(fn:typeof handler)=>{handler=fn;},env:{get:(key:string)=>env[key]}},client,(value:string)=>value==='owner@example.test',webcrypto);
  return {handler:handler!,read};
}
async function body(exp:number,subject='owner-id'){
  const grant=btoa(JSON.stringify({user_id:subject,exp}));const hash=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(grant+'|service-key'));return {admin_grant:grant,admin_grant_signature:Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')};
}
const request=(body:unknown,auth=true)=>new Request('https://example.test',{method:'POST',headers:auth?{Authorization:'Bearer signed-token'}:{},body:JSON.stringify(body)});
describe('owner operations read boundary',()=>{
  it('denies missing authentication before any data reads',async()=>{const a=app('owner@example.test');expect((await a.handler(request({},false))).status).toBe(401);expect(a.read).not.toHaveBeenCalled();});
  it('denies customer and role mismatch before service reads',async()=>{for(const a of [app('customer@example.test'),app('owner@example.test',false)]){expect((await a.handler(request({}))).status).toBe(403);expect(a.read).not.toHaveBeenCalled();}});
  it('denies expired, forged and another-subject grants',async()=>{for(const value of [await body(Date.now()-1),await body(Date.now()+60_000,'other'),{admin_grant:'forged',admin_grant_signature:'forged'}]){const a=app('owner@example.test');expect((await a.handler(request(value))).status).toBe(403);expect(a.read).not.toHaveBeenCalled();}});
  it('allows a verified owner to read only bounded fields and reports unknown queue counts',async()=>{
    const a=app('owner@example.test');
    const limit=vi.fn(async()=>({data:[],error:null})),query={order:vi.fn(()=>query),limit,eq:async()=>({count:null,error:{code:'unavailable'}})},select=vi.fn(()=>query);
    a.read.mockReturnValue({select});const response=await a.handler(request(await body(Date.now()+60_000)));
    expect(response.status).toBe(200);const data=await response.json();expect(data.availability.tickets).toBe('available');expect(data.queue.failed).toBeNull();expect(data.configuration.email_provider_configured).toBe(false);expect(limit).toHaveBeenCalledWith(501);expect(JSON.stringify(data)).not.toContain('service-key');
  });
  it('uses allowlisted bounded selects, never delivery bodies, credentials or audit payloads',()=>{expect(handlerSource).not.toContain("select('*')");expect(handlerSource).toContain('.limit(OPERATIONAL_PAGE_SIZE+1)');expect(handlerSource).not.toContain('previous_state');expect(handlerSource).not.toContain('provider_message_id');expect(handlerSource).not.toContain('last_error');expect(handlerSource).toContain("!!Deno.env.get('RESEND_API_KEY')");});
});

describe('bounded history endpoint pagination',()=>{
 const cursor={at:'2026-10-19T09:00:00Z',id:'11111111-1111-4111-8111-111111111111'};
 function history(a:ReturnType<typeof app>){const q={order:vi.fn(()=>q),or:vi.fn(()=>q),is:vi.fn(()=>q),lt:vi.fn(()=>q),limit:vi.fn(async()=>({data:[],error:null}))};a.read.mockReturnValue({select:vi.fn(()=>q)});return q;}
 it('reads only the allowlisted requested source with a stable timestamp and ID cursor',async()=>{const a=app('owner@example.test'),q=history(a);const response=await a.handler(request({...await body(Date.now()+60000),source:'emails',cursor}));expect(response.status).toBe(200);expect(a.read).toHaveBeenCalledTimes(1);expect(a.read).toHaveBeenCalledWith('email_send_log');expect(q.order).toHaveBeenCalledWith('id',{ascending:false});expect(q.or).toHaveBeenCalledWith('created_at.lt.'+cursor.at+',and(created_at.eq.'+cursor.at+',id.lt.'+cursor.id+'),created_at.is.null');expect(q.limit).toHaveBeenCalledWith(501);expect((await response.json()).pagination.emails).toEqual({has_more:false,cursor:null});});
 it('continues null timestamp rows using IDs without restarting dated history',async()=>{const a=app('owner@example.test'),q=history(a);expect((await a.handler(request({...await body(Date.now()+60000),source:'usage',cursor:{at:null,id:'123'}}))).status).toBe(200);expect(q.is).toHaveBeenCalledWith('sent_at',null);expect(q.lt).toHaveBeenCalledWith('id','123');expect(q.or).not.toHaveBeenCalled();});
 it.each([{source:'auth.users'},{source:'emails',cursor:{at:null,id:'1),id.gt.0'}},{cursor}])('rejects invalid source or cursor before service reads %j',async patch=>{const a=app('owner@example.test');expect((await a.handler(request({...await body(Date.now()+60000),...patch}))).status).toBe(400);expect(a.read).not.toHaveBeenCalled();});
});
