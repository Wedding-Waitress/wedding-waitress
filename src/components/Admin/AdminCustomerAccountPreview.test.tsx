import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {AdminCustomerAccountPreview} from './AdminCustomerAccountPreview';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc}}));
const fixture={read_only:true,customer:{name:'Preview Fixture',account_id:'AU-EXIST123',email:'fixture@example.test',mobile:'0411 123 456'},events:[{id:'event',name:'Fixture wedding',date:'2027-09-05',tables:[{id:'table',name:'Family table',table_no:1,capacity:8,type:'Round'}],guests:[{id:'guest',user_id:'target',event_id:'event',name:'Élodie O’Connor',first_name:'Élodie',last_name:'O’Connor',rsvp:'yes',dietary:'Vegetarian',table_no:1,seat_no:2,mobile:null,email:null,notes:null,relation_display:null,family_group:null,added_by_guest_id:null,rsvp_invite_status:null,allow_plus_one:false}]}]};
describe('owner read-only account preview',()=>{
 beforeEach(()=>{mock.rpc.mockReset().mockResolvedValue({data:fixture,error:null});});
 it('hides cached customer data during fresh permission checks and fails closed after access is denied',async()=>{
  render(<MemoryRouter><AdminCustomerAccountPreview customerId="target"/></MemoryRouter>);await screen.findByText('Preview Fixture');
  let resolve!:(value:unknown)=>void;mock.rpc.mockImplementation(()=>new Promise(value=>{resolve=value;}));
  act(()=>window.dispatchEvent(new Event('focus')));expect(screen.queryByText('Preview Fixture')).not.toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('Loading customer account');
  await act(async()=>resolve({data:null,error:{message:'Permission denied'}}));expect(screen.getByRole('alert')).toHaveTextContent('Customer account preview is unavailable');expect(screen.queryByText('Preview Fixture')).not.toBeInTheDocument();
 });
 it('scopes the request and supports read-only section navigation',async()=>{
  render(<MemoryRouter><AdminCustomerAccountPreview customerId="target"/></MemoryRouter>);
  await screen.findByText('Preview Fixture');
  expect(mock.rpc).toHaveBeenCalledWith('admin_get_customer_account_preview',{p_target:'target'});
  expect(screen.getByText(/You remain signed in as the administrator/)).toHaveTextContent('no customer notification');
  fireEvent.click(screen.getByRole('button',{name:'Guests'}));expect(screen.getByText('Élodie')).toBeInTheDocument();expect(screen.getByText('O’Connor')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Tables'}));expect(screen.getByText(/Complete owned table seating records are unavailable/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/save|delete|send|pay|export/i})).not.toBeInTheDocument();
  expect(mock.rpc).toHaveBeenCalledTimes(1);
 });
 it('fails closed on an unavailable or invalid preview response',async()=>{
  mock.rpc.mockResolvedValue({data:{read_only:false},error:null});
  render(<MemoryRouter><AdminCustomerAccountPreview customerId="target"/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('unavailable'));
  expect(screen.queryByText('Preview Fixture')).not.toBeInTheDocument();
 });
 it.each([{read_only:true},{...fixture,read_only:'true'},{...fixture,events:[{id:'event',name:'Malformed',date:null}]}])('rejects malformed successful RPC payloads without crashing',async(data)=>{
  mock.rpc.mockResolvedValue({data,error:null});
  render(<MemoryRouter><AdminCustomerAccountPreview customerId="target"/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('unavailable'));
  expect(screen.queryByText('Preview Fixture')).not.toBeInTheDocument();
 });
 it('distinguishes missing Reception payload from no saved customer plan',async()=>{
  render(<MemoryRouter><AdminCustomerAccountPreview customerId="target"/></MemoryRouter>);
  await screen.findByText('Preview Fixture');
  fireEvent.click(screen.getByRole('button',{name:'Reception Floor Plan'}));
  expect(screen.getByText('Saved Reception preview data is unavailable.')).toBeInTheDocument();
  expect(screen.queryByText('No saved Reception Floor Plan recorded.')).not.toBeInTheDocument();
 });
 it('hides prior customer data immediately when the target changes',async()=>{
  const view=render(<MemoryRouter><AdminCustomerAccountPreview customerId="target"/></MemoryRouter>);
  await screen.findByText('Preview Fixture');
  mock.rpc.mockImplementation(()=>new Promise(()=>{}));
  view.rerender(<MemoryRouter><AdminCustomerAccountPreview customerId="other-target"/></MemoryRouter>);
  expect(screen.queryByText('Preview Fixture')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Loading customer account');
 });
 it('fails closed on timeout and ignores a late successful response',async()=>{
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
  let resolve!:(value:any)=>void;
  mock.rpc.mockImplementation(()=>new Promise(value=>{resolve=value;}));
  const view=render(<MemoryRouter><AdminCustomerAccountPreview customerId="target"/></MemoryRouter>);
  try {
   act(()=>vi.advanceTimersByTime(10_000));
   expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
   await act(async()=>resolve({data:fixture,error:null}));
   expect(screen.queryByText('Preview Fixture')).not.toBeInTheDocument();
   expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
  } finally {view.unmount();vi.useRealTimers();}
 });
});
