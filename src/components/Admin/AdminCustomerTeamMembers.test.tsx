import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {AdminCustomerTeamMembers} from './AdminCustomerTeamMembers';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc}}));
const data={active_members:2,recorded_members:3,pending_invitations:1,maximum_seats:5,entries:[
 {id:'owner',kind:'member',name:'Owner Fixture',email:'owner@example.test',role:'master',status:'Accepted',is_owner:true},
 {id:'member',kind:'member',name:"Élodie O’Connor",email:'elodie@example.test',role:'standard',status:'Accepted',is_owner:false},
 {id:'disabled',kind:'member',name:'Disabled Fixture',email:'disabled@example.test',role:'standard',status:'Access disabled',is_owner:false},
 {id:'pending',kind:'invitation',name:'Pending Fixture',email:'pending@example.test',role:'standard',status:'pending',is_owner:false},
]};
function expand(){const details=document.querySelector('details')!;details.open=true;fireEvent(details,new Event('toggle'));}
describe('scoped read-only customer team roster',()=>{
 beforeEach(()=>mocks.rpc.mockReset().mockResolvedValue({data,error:null}));
 it('fetches only the opened account and displays actual owner/member/invitation states',async()=>{
  render(<AdminCustomerTeamMembers customerId='selected-account' ready activeCount={2} recordedCount={3}/>);
  expect(screen.getByText('2 active of 3 recorded seats')).toBeInTheDocument();expect(mocks.rpc).not.toHaveBeenCalled();
  expand();await screen.findByText('Owner Fixture — Account owner');
  expect(mocks.rpc).toHaveBeenCalledOnce();expect(mocks.rpc).toHaveBeenCalledWith('admin_get_customer_team_roster',{p_target:'selected-account'});
  expect(screen.getByText('elodie@example.test')).toBeInTheDocument();expect(screen.getByText('standard · Access disabled')).toBeInTheDocument();
  expect(screen.getByText(/maximum 5 seats, including the owner/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/invite|send|delete|revoke/i})).not.toBeInTheDocument();
 });
 it('keeps the old backend from receiving a missing RPC request',()=>{
  render(<AdminCustomerTeamMembers customerId='account' ready={false} activeCount={1} recordedCount={1}/>);
  expect(document.querySelector('details')).toBeNull();expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('shows failure honestly without removing aggregate counts',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:'unavailable'}});
  render(<AdminCustomerTeamMembers customerId='account' ready activeCount={2} recordedCount={3}/>);
  expand();await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded'));
  expect(screen.getByText('2 active of 3 recorded seats')).toBeInTheDocument();
 });
 it('distinguishes an empty roster from a loading/error state',async()=>{
  mocks.rpc.mockResolvedValue({data:{...data,entries:[],active_members:0,recorded_members:0,pending_invitations:0},error:null});
  render(<AdminCustomerTeamMembers customerId='account' ready activeCount={0} recordedCount={0}/>);
  expand();expect(await screen.findByText('No team membership or invitation records available.')).toBeInTheDocument();
 });
});
