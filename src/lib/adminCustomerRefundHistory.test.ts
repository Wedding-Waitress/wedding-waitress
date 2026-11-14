import {describe,it,expect,vi} from 'vitest';
import {readCustomerRefundHistory} from '../../supabase/functions/_shared/adminCustomerRefundHistory';
const customer='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row=(n=1)=>({id:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,account_owner_id:customer,
 administrator_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',payment_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 payment_type:'verified_plan_purchase',amount_minor:10945,currency:'aud',livemode:true,status:'succeeded',
 access_choice:'keep',access_status:'unchanged',reason:'Owner approved refund',customer_reason:'',stripe_refund_id:'re_Test',
 created_at:'2026-10-20T04:00:00.000Z',updated_at:'2026-10-20T04:01:00.000Z'});
function fixture(rows:any[]=[row()],error:any=null){
 const query:any={select:vi.fn(()=>query),eq:vi.fn(()=>query),order:vi.fn(()=>query),limit:vi.fn(()=>query),or:vi.fn(()=>query),
  then:(resolve:any)=>Promise.resolve({data:rows,error}).then(resolve)};
 const admin={from:vi.fn(()=>query)};return{admin,query};
}
describe('customer-scoped managed refund audit',()=>{
 it('filters and orders the ledger for exactly the requested customer',async()=>{
  const f=fixture();const result=await readCustomerRefundHistory(f.admin,customer);
  expect(result.customer_id).toBe(customer);expect(result.records).toEqual([row()]);expect(result.next_cursor).toBeNull();
  expect(f.admin.from).toHaveBeenCalledWith('admin_payment_refunds');
  expect(f.query.eq).toHaveBeenCalledWith('account_owner_id',customer);
  expect(f.query.order.mock.calls).toEqual([['created_at',{ascending:false}],['id',{ascending:false}]]);
 });
 it('retains pending, failed and uncertain attempts rather than treating them as paid refunds',async()=>{
  const f=fixture(['pending','failed','unknown'].map((status,i)=>({...row(i+1),status})));
  expect((await readCustomerRefundHistory(f.admin,customer)).records.map(r=>r.status)).toEqual(['pending','failed','unknown']);
 });
 it('uses a composite cursor so same-time records remain reachable',async()=>{
  const f=fixture(Array.from({length:51},(_,i)=>row(i+1)));
  const result=await readCustomerRefundHistory(f.admin,customer);
  expect(result.records).toHaveLength(50);expect(result.next_cursor).toBe(row(50).created_at+'|'+row(50).id);
  await readCustomerRefundHistory(f.admin,customer,result.next_cursor);
  expect(f.query.or).toHaveBeenCalledWith(`created_at.lt.${row(50).created_at},and(created_at.eq.${row(50).created_at},id.lt.${row(50).id})`);
 });
 it.each(['invalid','2026-10-20|invalid',"2026-10-20T04:00:00.000Z|00000000-0000-4000-8000-000000000001,amount.gt.0"])(
  'rejects an invalid cursor %s',async cursor=>{await expect(readCustomerRefundHistory(fixture().admin,customer,cursor)).rejects.toThrow();});
 it('rejects foreign customer data and provider failure without returning an empty history',async()=>{
  await expect(readCustomerRefundHistory(fixture([{...row(),account_owner_id:'foreign'}]).admin,customer)).rejects.toThrow();
  await expect(readCustomerRefundHistory(fixture([],{message:'private'}).admin,customer)).rejects.toThrow();
  await expect(readCustomerRefundHistory(fixture().admin,'invalid')).rejects.toThrow();
 });
});
