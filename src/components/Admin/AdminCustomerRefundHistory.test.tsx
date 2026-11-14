import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {AdminCustomerRefundHistory} from './AdminCustomerRefundHistory';
const {invoke}=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
const customer='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row={id:'refund1',account_owner_id:customer,payment_id:'payment1',payment_type:'verified_plan_purchase',amount_minor:10945,
 currency:'aud',livemode:true,status:'pending',access_choice:'suspend',access_status:'waiting',reason:'Customer requested refund',
 customer_reason:'Refund approved; account access will end.',created_at:'2026-10-20T04:00:00.000Z',updated_at:'2026-10-20T04:01:00.000Z'};
const response=(records=[row],next_cursor:string|null=null)=>({data:{success:true,customer_id:customer,records,next_cursor},error:null});
beforeEach(()=>{invoke.mockReset();invoke.mockResolvedValue(response());});
describe('customer refund history',()=>{
 it('shows amount, exact status, reason and the separate access outcome under the customer',async()=>{
  render(<AdminCustomerRefundHistory customerId={customer}/>);
  await screen.findByText('$109.45');expect(screen.getByText('pending')).toBeInTheDocument();
  expect(screen.getByText('waiting')).toBeInTheDocument();expect(screen.getByText(row.reason)).toBeInTheDocument();
  expect(screen.getByText(row.customer_reason)).toBeInTheDocument();
  expect(invoke).toHaveBeenCalledWith('admin-payment-refund',expect.objectContaining({body:expect.objectContaining({action:'customer_history',customer_id:customer})}));
  expect(screen.queryByRole('button',{name:'Confirm refund'})).not.toBeInTheDocument();
 });
 it('makes older customer records reachable and refreshes without issuing a refund',async()=>{
  const cursor='2026-10-20T04:00:00.000Z|00000000-0000-4000-8000-000000000001';
  invoke.mockResolvedValueOnce(response([row],cursor));render(<AdminCustomerRefundHistory customerId={customer}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Older refunds'}));
  await waitFor(()=>expect(invoke.mock.calls.at(-1)[1].body.cursor).toBe(cursor));
  await screen.findByText('$109.45');fireEvent.click(screen.getByRole('button',{name:'Refresh customer refunds'}));
  await waitFor(()=>expect(invoke).toHaveBeenCalledTimes(3));
  expect(invoke.mock.calls.every(call=>call[1].body.action==='customer_history')).toBe(true);
 });
 it('does not show old or foreign customer history after a customer switch',async()=>{
  let resolve!:(value:any)=>void;invoke.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  const view=render(<AdminCustomerRefundHistory customerId={customer}/>);
  const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  invoke.mockResolvedValue({data:{success:true,customer_id:other,records:[],next_cursor:null},error:null});
  view.rerender(<AdminCustomerRefundHistory customerId={other}/>);
  await screen.findByText('No managed refunds recorded for this customer.');
  resolve(response());await Promise.resolve();expect(screen.queryByText('$109.45')).not.toBeInTheDocument();
 });
 it('does not mistake an unavailable or foreign response for no refunds',async()=>{
  invoke.mockResolvedValue({data:{success:true,customer_id:'foreign',records:[],next_cursor:null},error:null});
  render(<AdminCustomerRefundHistory customerId={customer}/>);await screen.findByRole('alert');
  expect(screen.queryByText('No managed refunds recorded for this customer.')).not.toBeInTheDocument();
 });
});
