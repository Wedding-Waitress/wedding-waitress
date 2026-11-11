import {describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import ts from 'typescript';
function fixture(options:any={}){
 let handler:any;
 const record={id:'request-test',charge_id:'ch_original'};
 const lookup=vi.fn(async()=>({data:options.missing?null:record,error:options.lookupError?{}:null}));
 const query:any={select:()=>query,eq:()=>query,maybeSingle:lookup};
 const admin={from:vi.fn(()=>query)};
 const reconcile=vi.fn(async()=>{if(options.reconcileError)throw Error('unconfirmed');});
 const stripe={webhooks:{constructEventAsync:vi.fn(async()=>{if(options.invalid)throw Error('invalid');return {type:'refund.updated',livemode:true,data:{object:{id:'re_original',metadata:{ww_refund_request:'request-test'}}},...options.event};})}};
 const StripeMock:any=function(){return stripe;};StripeMock.createSubtleCryptoProvider=()=>({});
 const source=fs.readFileSync('supabase/functions/stripe-refund-webhook/index.ts','utf8').replace(/^import .*$/gm,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 new Function('Stripe','createClient','reconcileRefund','Deno',compiled)(StripeMock,()=>admin,reconcile,
  {env:{get:(name:string)=>({STRIPE_REFUND_RESTRICTED_KEY:'rk_live_fixture',STRIPE_REFUND_WEBHOOK_SECRET:'whsec_fixture',ADMIN_REFUNDS_ENABLED:options.disabled?'false':'true'}[name])},serve:(fn:any)=>{handler=fn;}});
 const request=(signature=true)=>handler(new Request('https://isolated.test',{method:'POST',headers:signature?{'stripe-signature':'synthetic-signature'}:{},body:'original raw bytes'}));
 return {request,reconcile,admin,stripe};
}
describe('refund webhook authenticates before reconciliation',()=>{
 it('passes original raw bytes and signature to Stripe and re-fetches a managed refund',async()=>{const f=fixture();expect((await f.request()).status).toBe(200);expect(f.stripe.webhooks.constructEventAsync.mock.calls[0].slice(0,3)).toEqual(['original raw bytes','synthetic-signature','whsec_fixture']);expect(f.reconcile).toHaveBeenCalledWith(f.admin,f.stripe,expect.objectContaining({stripe_refund_id:'re_original'}));});
 it.each([{invalid:true},{event:{livemode:false}}])('rejects invalid or wrong-mode events %j',async options=>{const f=fixture(options);expect((await f.request()).status).toBe(400);expect(f.reconcile).not.toHaveBeenCalled();});
 it('rejects missing signatures',async()=>{const f=fixture();expect((await f.request(false)).status).toBe(400);expect(f.admin.from).not.toHaveBeenCalled();});
 it('continues recording already-issued refunds when new refund actions are disabled',async()=>{const f=fixture({disabled:true});expect((await f.request()).status).toBe(200);expect(f.reconcile).toHaveBeenCalledOnce();});
 it.each([{event:{type:'ww.readiness_signature_check'}},{event:{data:{object:{id:'re_external',metadata:{}}}}},{missing:true}])('ignores unrelated or unmanaged events %j',async options=>{const f=fixture(options);expect((await f.request()).status).toBe(200);expect(f.reconcile).not.toHaveBeenCalled();});
 it.each([{lookupError:true},{reconcileError:true}])('asks Stripe to retry unconfirmed recording %j',async options=>{const f=fixture(options);expect((await f.request()).status).toBe(503);});
});
