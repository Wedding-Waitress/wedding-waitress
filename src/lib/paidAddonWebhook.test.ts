import { it as test } from 'vitest';
import assert from 'node:assert/strict';
import { fulfillPaidAddonWebhook } from '../../supabase/functions/_shared/paidAddonWebhook.ts';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', event='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const cases: any[]=[
 ['additional_event',9900,1,'price_1UFTqL5GzTmqOxGKgPWVdCwr','ww_live_20260914_v2_additional_event','fulfill_additional_event_purchase_gst',{}],
 ['guest_capacity_topup',1000,3,'price_1UFTqV5GzTmqOxGKkLYcl2PS','ww_live_20260914_v2_guest_capacity_10','fulfill_guest_capacity_topup_gst',{event_id:event,overage_blocks:'3',guest_count_at_purchase:'120'}],
 ['communication_topup',1000,1,'price_1UFTqt5GzTmqOxGKhwwnh4Wj','ww_live_20260914_v2_communication_10','fulfill_communication_credit_topup_gst',{event_id:event,communication_topup_pack:'credits_10'}],
 ['communication_topup',4900,1,'price_1UFTr55GzTmqOxGKsh0sjgjK','ww_live_20260914_v2_communication_100','fulfill_communication_credit_topup_gst',{event_id:event,communication_topup_pack:'credits_100'}],
 ['additional_event',9000,1,'price_NewAdditional99','ww_live_20260914_v2_additional_event','fulfill_additional_event_purchase_gst',{additional_event_version:'ww_additional_event_99_total_v1'}],
];
function fixture(c: any=cases[0]) {
 const [kind,cents,quantity,price,product,rpc,metadata]=c, subtotal=cents*quantity,total=subtotal+Math.round(subtotal/10);
 const charge={object:'charge',livemode:true,status:'succeeded',currency:'aud',amount:total,paid:true,captured:true,refunded:false,amount_refunded:0,disputed:false,payment_intent:'pi_QA1'};
 const intent={object:'payment_intent',id:'pi_QA1',livemode:true,status:'succeeded',currency:'aud',amount:total,amount_received:total,latest_charge:charge};
 const session={object:'checkout.session',id:'cs_live_QA1',livemode:true,mode:'payment',status:'complete',payment_status:'paid',currency:'aud',amount_subtotal:subtotal,amount_total:total,payment_intent:'pi_QA1',
 total_details:{amount_discount:0,amount_shipping:0,amount_tax:subtotal/10},
 metadata:{user_id:owner,purchase_type:kind,...metadata},
 line_items:{has_more:false,data:[{quantity,amount_subtotal:subtotal,price:{id:price,product,active:true,livemode:true,tax_behavior:'exclusive',currency:'aud',unit_amount:cents}}]}};
 const calls: any[]=[]; let replay=false, blocked=false, failure=false;
 const admin={rpc:async(name: string,args: any)=>{calls.push([name,args]);return name==='is_account_suspension_blocked'?{data:blocked,error:null}:{data:{already_fulfilled:replay},error:failure?{message:'database unavailable'}:null};}};
 const stripe={paymentIntents:{retrieve:async()=>intent}};
 return {session,intent,charge,calls,admin,stripe,run:()=>fulfillPaidAddonWebhook(session,stripe,admin),rpc,
 setReplay:()=>{replay=true;},setBlocked:()=>{blocked=true;},setFailure:()=>{failure=true;}};
}
for(const c of cases) test('recovers '+c[0]+' '+c[1]+' cents without a return page',async()=>{
 const f=fixture(c); assert.deepEqual(await f.run(),{received:true,fulfillment:'fulfilled'});
 assert.equal(f.calls.at(-1)[0],c[5]); assert.equal(f.calls.at(-1)[1]._user_id,owner);
 f.setReplay(); assert.deepEqual(await f.run(),{received:true,fulfillment:'already_fulfilled'});
});
test('does not grant while delayed payment is unpaid',async()=>{const f=fixture();f.session.payment_status='unpaid';assert.deepEqual(await f.run(),{received:true,pending:true});assert.equal(f.calls.length,0);});
const rejectionCases: Array<[string, (f: ReturnType<typeof fixture>) => void]> = [
 ['sandbox',f=>{f.session.livemode=false;}],['incomplete',f=>{f.session.status='open';}],
 ['multiple lines',f=>{f.session.line_items.data.push(f.session.line_items.data[0]);}],
 ['truncated lines',f=>{f.session.line_items.has_more=true;}],
 ['wrong product',f=>{f.session.line_items.data[0].price.product='prod_Foreign';}],
 ['wrong price',f=>{f.session.line_items.data[0].price.id='price_Foreign';}],
 ['wrong quantity',f=>{f.session.line_items.data[0].quantity=2;}],
 ['wrong GST',f=>{f.session.total_details.amount_tax=0;}],
 ['discount',f=>{f.session.total_details.amount_discount=1;}],
 ['foreign intent',f=>{f.intent.id='pi_Foreign';}],
 ['uncaptured',f=>{f.charge.captured=false;}],
 ['refunded',f=>{f.charge.refunded=true;f.charge.amount_refunded=1;}],
 ['disputed',f=>{f.charge.disputed=true;}],
 ['suspended',f=>{f.setBlocked();}],
 ];
for(const [name,change] of rejectionCases) test('refuses '+name+' before purchase grant',async()=>{
 const f=fixture();change(f);await assert.rejects(f.run());assert.ok(!f.calls.some(c=>c[0]===f.rpc));
});
test('database failure is retryable rather than acknowledged',async()=>{const f=fixture();f.setFailure();await assert.rejects(f.run());});
test('does not consume package or promotion handlers',async()=>{const f=fixture();f.session.metadata.purchase_type='';assert.deepEqual(await f.run(),{received:true,ignored:true});assert.equal(f.calls.length,0);});
test('rejects malformed block counts',async()=>{const f=fixture(cases[1]);f.session.metadata.overage_blocks='3junk';await assert.rejects(f.run());assert.equal(f.calls.length,0);});


import fs from 'node:fs';
import ts from 'typescript';
function handlerFixture(c: any = cases[0], eventType = 'checkout.session.completed') {
 const f = fixture(c);
 let handler!: (req: Request) => Promise<Response>;
 const provider = { ...f.stripe, checkout: { sessions: { retrieve: async () => f.session } },
   webhooks: { constructEventAsync: async () => ({ type: eventType, livemode: true, data: { object: { id: f.session.id } } }) } };
 const StripeMock: any = function () { return provider; };
 StripeMock.createSubtleCryptoProvider = () => ({});
 const source=fs.readFileSync('supabase/functions/stripe-access-extension-webhook/index.ts','utf8').replace(/^import .*$/gm,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 new Function('Stripe','createClient','validatePaidAccessExtension','fulfillPaidPlanWebhook','fulfillPaidAddonWebhook','Deno','console',compiled)(
  StripeMock,()=>f.admin,()=>({ok:false}),()=>{throw new Error('Wrong dispatch');},fulfillPaidAddonWebhook,
  {env:{get:()=> 'isolated'},serve:(callback: typeof handler)=>{handler=callback;}},{error:()=>{}});
 return {...f, deliver:()=>handler(new Request('https://isolated.test',{method:'POST',headers:{'stripe-signature':'verified-fixture'},body:'{}'}))};
}
for(const c of cases) for(const eventType of ['checkout.session.completed','checkout.session.async_payment_succeeded']) {
 test('signed '+eventType+' dispatches '+c[0]+' '+c[1],async()=>{
  const f=handlerFixture(c,eventType);const response=await f.deliver();assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{received:true,fulfillment:'fulfilled'});
 });
}
test('signed paid add-on database failure returns 500 for provider retry',async()=>{
 const f=handlerFixture();f.setFailure();assert.equal((await f.deliver()).status,500);
});


test('recovers an already-paid purchase after its catalogue price is retired', async()=>{
 const f=fixture(); f.session.line_items.data[0].price.active=false;
 assert.deepEqual(await f.run(),{received:true,fulfillment:'fulfilled'});
});


