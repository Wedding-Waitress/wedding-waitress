import {describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';import ts from 'typescript';
function fixture(options:any={}){
 let handler:any;const rpc=vi.fn(async(name:string)=>({data:name==='claim_access_expiry_reminders'?[]:0,error:name===options.fail?{}:null}));
 const batch=vi.fn(async()=>({processed:0,providerAccepted:0,failed:0,manualReview:0,recordingFailed:0,...options.result}));
 if(options.held)rpc.mockImplementation(async(name:string)=>({data:name==='claim_access_expiry_reminders'?[]:name==='hold_stale_access_expiry_reminders'?1:0,error:null}));
 const source=fs.readFileSync('supabase/functions/process-access-expiry-reminders/index.ts','utf8').replace(/^import .*$/gm,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 new Function('createClient','processAccessExpiryBatch','sendPlatformSms','Deno',compiled)(()=>({rpc}),batch,vi.fn(),
  {env:{get:()=>options.missing?undefined:'isolated-secret'},serve:(fn:any)=>{handler=fn;}});
 const request=(secret='isolated-secret')=>handler(new Request('https://isolated.test',{method:'POST',headers:{'x-access-expiry-processor-secret':secret}}));
 return{request,rpc,batch};
}
describe('expiry worker scheduler boundary',()=>{
 it('rejects a wrong secret before any queue operation',async()=>{const f=fixture();expect((await f.request('wrong')).status).toBe(401);expect(f.rpc).not.toHaveBeenCalled();});
 it('fails closed on missing configuration',async()=>{const f=fixture({missing:true});expect((await f.request()).status).toBe(500);expect(f.rpc).not.toHaveBeenCalled();});
 it.each(['hold_stale_access_expiry_reminders','schedule_access_expiry_reminders','claim_access_expiry_reminders'])('does not send when %s fails',async fail=>{const f=fixture({fail});expect((await f.request()).status).toBe(503);expect(f.batch).not.toHaveBeenCalled();});
 it('confirms a successful empty queue and bounds the claim size',async()=>{const f=fixture();const r=await f.request();expect(r.status).toBe(200);expect(await r.json()).toMatchObject({processed:0,failed:0});expect(f.rpc).toHaveBeenCalledWith('claim_access_expiry_reminders',{_limit:6});});
 it('keeps unresolved manual-review holds visible',async()=>{const f=fixture({held:true});expect((await f.request()).status).toBe(503);});
 it.each([{failed:1},{manualReview:1},{recordingFailed:1}])('does not claim success with %j',async result=>{const f=fixture({result});expect((await f.request()).status).toBe(503);});
});
