import {beforeEach,describe,expect,it,vi} from 'vitest';
import {resolveRefundPayment,submitRefund,reconcileRefund} from '../../supabase/functions/_shared/adminRefundService';
const requestId='77777777-7777-4777-8777-777777777777';
const payment={id:'payment1',user_id:'customer1',amount_paid:199,stripe_payment_id:'pi_original'};
const charge={id:'ch_original',paid:true,captured:true,disputed:false,currency:'aud',livemode:false,status:'succeeded',amount:19900,amount_refunded:0};
const record={id:requestId,amount_minor:4900,currency:'aud',livemode:false,charge_id:'ch_original',access_choice:'keep',reason:'Owner reviewed refund',customer_reason:'',payment_id:'payment1',payment_type:'plan_purchase',administrator_id:'owner'};
const refund={id:'re_refund',amount:4900,currency:'aud',livemode:false,charge:'ch_original',status:'pending',metadata:{ww_refund_request:requestId}};
const body={action:'submit',request_id:requestId,payment_type:'plan_purchase',payment_id:'payment1',amount_minor:4900,access_choice:'keep',reason:'Owner reviewed refund',customer_reason:'',confirmed:true};
let admin:any,stripe:any,previous:any;
beforeEach(()=>{
 previous=null;
 admin={from:vi.fn((table:string)=>{const query:any={select:vi.fn(()=>query),eq:vi.fn(()=>query),update:vi.fn(()=>query),single:vi.fn(async()=>({data:payment,error:null})),maybeSingle:vi.fn(async()=>({data:previous,error:null})),then:(resolve:any)=>resolve({data:null,error:null})};return query;}),rpc:vi.fn(async(name:string)=>({data:name==='admin_reserve_payment_refund'?{is_new:true,record}:{...record,stripe_refund_id:'re_refund',status:'pending'},error:null}))};
 stripe={paymentIntents:{retrieve:vi.fn(async()=>({status:'succeeded',livemode:false,latest_charge:charge}))},charges:{retrieve:vi.fn(async()=>charge)},refunds:{create:vi.fn(async()=>refund),retrieve:vi.fn(async()=>refund),list:vi.fn(()=>({async *[Symbol.asyncIterator](){yield refund;}}))}};
});
describe('refund server service with mocked Stripe only',()=>{
 it('resolves a paid promotional amount through its service-only ledger context',async()=>{
  admin.rpc.mockResolvedValue({data:{id:'promo1',user_id:'customer1',amount_total_cents:19900,stripe_payment_intent_id:'pi_original'},error:null});
  expect(await resolveRefundPayment(admin,stripe,'promotion_plan_purchase','promo1',false)).toMatchObject({remaining:19900});
  expect(admin.rpc).toHaveBeenCalledWith('promotion_refund_payment_context',{p_id:'promo1'});
  expect(admin.from).not.toHaveBeenCalled();
 });
 it('rejects a no-cost promotional checkout before any provider refund lookup',async()=>{
  await expect(resolveRefundPayment(admin,stripe,'promotion_no_cost','promo1',false)).rejects.toThrow();
  expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();expect(stripe.refunds.create).not.toHaveBeenCalled();
 });
 it('uses the database reference, actual charge and durable idempotency key',async()=>{await submitRefund(admin,stripe,'owner',body,false);expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_original',{expand:['latest_charge']});expect(stripe.refunds.create).toHaveBeenCalledWith({charge:'ch_original',amount:4900,metadata:{ww_refund_request:requestId}},{idempotencyKey:`ww-refund-${requestId}`});expect(admin.rpc).toHaveBeenCalledWith('admin_record_payment_refund',{p_request_id:requestId,p_refund_id:'re_refund',p_status:'pending'});});
 it.each([{disputed:true},{livemode:true},{currency:'usd'},{paid:false},{captured:false},{amount:999}])('rejects unsafe provider evidence %j',async(change)=>{stripe.paymentIntents.retrieve.mockResolvedValue({status:'succeeded',livemode:false,latest_charge:{...charge,...change}});await expect(submitRefund(admin,stripe,'owner',body,false)).rejects.toThrow();expect(stripe.refunds.create).not.toHaveBeenCalled();});
 it('requires explicit confirmation before provider lookup or mutation',async()=>{await expect(submitRefund(admin,stripe,'owner',{...body,confirmed:false},false)).rejects.toThrow();expect(stripe.refunds.create).not.toHaveBeenCalled();expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();});
 it('reconciles an existing request rather than creating a duplicate',async()=>{previous=record;admin.rpc.mockImplementation(async(name:string)=>({data:name==='admin_reserve_payment_refund'?{is_new:false,record}:{...record,status:'pending'},error:null}));await submitRefund(admin,stripe,'owner',body,false);expect(stripe.refunds.create).not.toHaveBeenCalled();expect(stripe.refunds.list).toHaveBeenCalled();});
 it('does not retry create when the provider outcome is unknown',async()=>{stripe.refunds.create.mockRejectedValue(new Error('Network unavailable'));await expect(submitRefund(admin,stripe,'owner',body,false)).rejects.toThrow(/unconfirmed/);expect(stripe.refunds.create).toHaveBeenCalledTimes(1);});
 it('rejects mismatched refund evidence before recording status or suspension',async()=>{stripe.refunds.retrieve.mockResolvedValue({...refund,amount:999});await expect(reconcileRefund(admin,stripe,{...record,stripe_refund_id:'re_refund'})).rejects.toThrow(/mismatch/);expect(admin.rpc).not.toHaveBeenCalled();});
 it('does not invent a result when an uncertain refund cannot be found',async()=>{stripe.refunds.list.mockReturnValue({async *[Symbol.asyncIterator](){}});expect(await reconcileRefund(admin,stripe,record)).toEqual(record);expect(admin.rpc).not.toHaveBeenCalled();});
 it('rejects unsupported payment mappings rather than guessing',async()=>{await expect(resolveRefundPayment(admin,stripe,'unmapped','payment1',false)).rejects.toThrow(/separately reviewed/);});
});
