import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),signOut:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,auth:{signOut:mocks.signOut}}}));
import {SuspensionNotice} from './SuspensionNotice';
import {AdminAccountAccessDetail} from '../Admin/AdminAccountAccessDetail';
describe('private suspension reply surface',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:'reply-id',error:null});mocks.signOut.mockResolvedValue({error:null});});
 it('shows the customer reason as text and only essential actions',()=>{
  render(<MemoryRouter><SuspensionNotice access={{status:'suspended',customer_reason:'Review Élodie O’Connor <script>no execution</script>'}}/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:'Your account is suspended'})).toBeInTheDocument();
  expect(screen.getByText('Review Élodie O’Connor <script>no execution</script>')).toBeInTheDocument();
  expect(screen.getAllByRole('button').map(b=>b.textContent)).toEqual(['Sign out','Send reply']);
  expect(screen.getByRole('textbox')).toHaveAttribute('maxLength','2000');
 });
 it('submits only own message and idempotency key, with no recipient/event/email',async()=>{
  render(<MemoryRouter><SuspensionNotice access={{status:'suspended'}}/></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:' Please review privately. '}});fireEvent.click(screen.getByRole('button',{name:'Send reply'}));
  await screen.findByText('Your reply has been saved for the Wedding Waitress owner to review.');
  expect(mocks.rpc).toHaveBeenCalledWith('reply_to_account_suspension',{p_message:'Please review privately.',p_request_id:expect.any(String)});
  expect(screen.getByRole('textbox')).toHaveValue('');
 });
 it('retains the same request key after an unconfirmed request',async()=>{
  mocks.rpc.mockResolvedValueOnce({error:{message:'PRIVATE DATABASE DETAIL'}});
  render(<MemoryRouter><SuspensionNotice access={{status:'suspended'}}/></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Retry safely'}});fireEvent.click(screen.getByRole('button',{name:'Send reply'}));
  await screen.findByText('Your reply could not be confirmed. Please try again.');
  expect(screen.queryByText('PRIVATE DATABASE DETAIL')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Send reply'}));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledTimes(2));
  expect(mocks.rpc.mock.calls[1][1]).toEqual(mocks.rpc.mock.calls[0][1]);
 });
 it('renders owner replies and separate customer/audit reasons',async()=>{
  const approve=vi.fn();mocks.rpc.mockResolvedValue({data:{control:{status:'suspended',customer_reason:'Customer note',internal_audit_reason:'Internal note'},review:{status:'pending',match_kind:'full_name'},replies:[{id:'one',message:'Customer private reply',status:'open',created_at:'2026-09-12T01:00:00Z'}]},error:null});
  render(<AdminAccountAccessDetail customerId="fixture" onApproveReview={approve}/>);
  await screen.findByText('Customer private reply');expect(screen.getByText('Customer note')).toBeInTheDocument();expect(screen.getByText('Internal note')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Approve registration review'}));expect(approve).toHaveBeenCalledOnce();
  expect(mocks.rpc).toHaveBeenCalledWith('admin_get_account_access_detail',{p_target:'fixture'});
 });
});
