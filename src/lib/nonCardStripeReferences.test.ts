import {describe,it,expect,vi} from 'vitest';
import {readLiveBillingPage} from '../../supabase/functions/_shared/adminLiveBilling';
import {reconcileRecordedPayments} from './adminBillingReconciliation';
import {resolveRefundPayment} from '../../supabase/functions/_shared/adminRefundService';
const charge={id:'py_NonCardFixture',object:'charge',created:1792400000,amount:9900,amount_captured:9900,amount_refunded:0,currency:'aud',status:'succeeded',paid:true,captured:true,disputed:false,payment_intent:'pi_NonCardFixture',livemode:true};
const page=(data:any[],has_more=false)=>vi.fn(async()=>Response.json({object:'list',data,has_more}));
describe('Stripe non-card charge references',()=>{
 it('accepts a verified non-card charge and uses its actual identifier for pagination',async()=>{
  const send=page([charge],true);const result=await readLiveBillingPage('rk_live_fixture','charges','py_PreviousFixture',send);
  expect(result.records[0]).toMatchObject({id:charge.id,chargeId:charge.id,amountMinor:9900});expect(result.next_cursor).toBe(charge.id);
  expect(send).toHaveBeenCalledWith(expect.stringContaining('starting_after=py_PreviousFixture'),expect.objectContaining({method:'GET'}));
  expect(reconcileRecordedPayments([{id:'recorded',payment_type:'plan_purchase',amount_paid:99,status:'succeeded',stripe_reference:charge.id}],result.records,[],{charges:true,sessions:true})[0].state).toBe('matched');
 });
 it('accepts a non-card charge reference in refund provider records',async()=>{
  const result=await readLiveBillingPage('rk_live_fixture','refunds',undefined,page([{id:'re_Fixture',amount:100,created:1792400000,currency:'aud',status:'succeeded',charge:charge.id,payment_intent:charge.payment_intent}]));
  expect(result.records[0].chargeId).toBe(charge.id);
 });
 it('resolves an explicitly recorded non-card payment reference without guessing another payment',async()=>{
  const query:any={select:()=>query,eq:()=>query,single:async()=>({data:{id:'recorded',user_id:'customer',amount_paid:99,stripe_payment_id:charge.id},error:null})};
  const stripe={charges:{retrieve:vi.fn(async()=>charge)}};
  expect(await resolveRefundPayment({from:()=>query},stripe,'plan_purchase','recorded',true)).toMatchObject({remaining:9900});expect(stripe.charges.retrieve).toHaveBeenCalledWith(charge.id);
 });
 it.each(['py_Bad?secret=1','xx_UnknownFixture'])('still rejects unexpected or injected references %s',async id=>{
  await expect(readLiveBillingPage('rk_live_fixture','charges',undefined,page([{...charge,id}]))).rejects.toThrow();
 });
});
