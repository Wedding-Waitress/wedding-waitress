import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe,it,expect,vi } from 'vitest';
import { validatePrelaunchRegistration } from '../../supabase/functions/_shared/prelaunchRegistration';
const input={first_name:'Alex',last_name:'Taylor',email:'Alex@Example.com',mobile:'0412345678',promo_code:'VENUE50',intended_plan:'essential'};
function endpoint(result:unknown={data:{saved:true},error:null}){
 let handler:(request:Request)=>Promise<Response>;
 const rpc=vi.fn().mockResolvedValue(result),client=vi.fn(()=>({rpc}));
 const source=readFileSync('supabase/functions/register-prelaunch-interest/index.ts','utf8').replace(/^import .*$/gm,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 new Function('Deno','createClient','validatePrelaunchRegistration',compiled)({env:{get:(key:string)=>key==='SUPABASE_URL'?'https://fixture.test':'fixture-service-key'},serve:(fn:typeof handler)=>{handler=fn;}},client,validatePrelaunchRegistration);
 return {handler:handler!,rpc,client};
}
const request=(body:unknown=input)=>new Request('https://fixture.test',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'203.0.113.10'},body:JSON.stringify(body)});
describe('anonymous durable launch registration endpoint',()=>{
 it('returns saved only after private persistence and stores no raw IP or privileges',async()=>{const app=endpoint();const response=await app.handler(request({...input,owner:true}));expect(await response.json()).toEqual({saved:true});expect(app.rpc).toHaveBeenCalledWith('save_prelaunch_registration',{p_details:{...input,email:'alex@example.com'},p_source_hash:expect.stringMatching(/^[a-f0-9]{64}$/)});expect(JSON.stringify(app.rpc.mock.calls)).not.toContain('203.0.113.10');});
 it('returns identical success for a durable duplicate without account creation',async()=>{const app=endpoint();expect(await (await app.handler(request())).json()).toEqual(await (await app.handler(request())).json());expect(app.rpc).toHaveBeenCalledTimes(2);});
 it.each([{data:null,error:null},{data:{saved:false},error:null},{data:{saved:true},error:{message:'private'}}])('never claims success on failed or uncertain persistence',async result=>{const app=endpoint(result);const response=await app.handler(request());expect(response.status).toBe(503);expect(await response.text()).not.toContain('private');});
 it('rejects invalid input before persistence',async()=>{const app=endpoint();expect((await app.handler(request({...input,mobile:'invalid'}))).status).toBe(400);expect(app.rpc).not.toHaveBeenCalled();});
 it('bounds request bodies with no declared length',async()=>{const app=endpoint();expect((await app.handler(request({...input,promo_code:'x'.repeat(9000)}))).status).toBe(413);expect(app.rpc).not.toHaveBeenCalled();});
 it('leaves preflight and unsupported methods without mutations',async()=>{const app=endpoint();expect((await app.handler(new Request('https://fixture.test',{method:'OPTIONS'}))).status).toBe(200);expect((await app.handler(new Request('https://fixture.test'))).status).toBe(405);expect(app.rpc).not.toHaveBeenCalled();});
});
