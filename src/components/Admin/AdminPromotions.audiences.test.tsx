import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPromotions } from './AdminPromotions';
const invoke=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
const id='00000000-0000-4000-8000-000000000002';
const account={id,account_id:'ACC-002',name:'Example Venue',email:'venue@example.test'};
const created={expiry_version:1,expiry_date:null,expires_at:null,id:'campaign-1',code:'SAVE50',campaign_name:'Example campaign',percent_off:50,active:true,audience_version:2,audience:'general',usage_limit:0,used:0,reserved:0,remaining:0};
const change=(label:string,value:string)=>fireEvent.change(screen.getByLabelText(label,{selector:'input,select'}),{target:{value}});
const details=()=>{change('Campaign name','Example campaign');change('Promo code','SAVE50');};
beforeEach(()=>{invoke.mockReset();sessionStorage.clear();sessionStorage.setItem('ww_admin_grant','fixture');sessionStorage.setItem('ww_admin_grant_sig','signature');});
describe('promotion audiences and usage allocation',()=>{
 it('provides all three audiences and exactly 0 through 100, including a true zero allocation',async()=>{
  invoke.mockResolvedValue({data:{success:true,data:created}});render(<AdminPromotions/>);
  const options=within(screen.getByLabelText('Usage limit')).getAllByRole('option');
  expect(options).toHaveLength(101);expect(options[0]).toHaveValue('0');expect(options[100]).toHaveValue('100');
  expect(within(screen.getByLabelText('Audience')).getAllByRole('option').map(el=>el.textContent)).toEqual(['General','Specific customer','Venue / Partner']);
  details();change('Usage limit','0');fireEvent.click(screen.getByRole('button',{name:'Create promo code'}));
  await waitFor(()=>expect(invoke).toHaveBeenCalledWith('admin-promotions',{body:expect.objectContaining({action:'create_expiring_campaign',audience:'general',usage_limit:0,bound_account_id:null})}));
  expect(await screen.findByRole('definition',{name:'Allocated'})).toHaveTextContent('0');
  for (const label of ['Used','Reserved','Remaining']) expect(screen.getByRole('definition',{name:label})).toHaveTextContent('0');
 });
 it.each([['customer','Customer account email'],['venue_partner','Venue / Partner account email']])('requires explicit account confirmation for %s and clears it when email changes',async(audience,label)=>{
  invoke.mockImplementation((_name,{body})=>Promise.resolve({data:{success:true,data:body.action==='search_accounts'?[account]:{...created,audience,usage_limit:100,bound_account_id:id}}}));
  render(<AdminPromotions/>);details();change('Audience',audience);change('Usage limit','100');
  expect(screen.getByRole('button',{name:'Create promo code'})).toBeDisabled();change(label,'VENUE@example.test');
  fireEvent.click(screen.getByRole('button',{name:'Find account'}));
  const select=await screen.findByRole('button',{name:'Select Example Venue'});expect(screen.getByText(/Account ACC-002/)).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Create promo code'})).toBeDisabled();fireEvent.click(select);
  expect(screen.getByRole('button',{name:'Create promo code'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Create promo code'}));
  await waitFor(()=>expect(invoke).toHaveBeenCalledWith('admin-promotions',{body:expect.objectContaining({action:'create_expiring_campaign',audience,usage_limit:100,bound_account_id:id})}));
  await screen.findByRole('button',{name:'Pause'});change(label,'other@example.test');expect(screen.getByRole('button',{name:'Create promo code'})).toBeDisabled();
 });
 it('explains venue distribution, account first-purchase eligibility, and pending allocations',()=>{
  render(<AdminPromotions/>);change('Audience','venue_partner');
  expect(screen.getByText(/Couples redeem it from their own accounts/)).toBeInTheDocument();
  expect(screen.getByText(/renewals are excluded/)).toBeInTheDocument();
  expect(screen.getByText(/Pausing and reactivating never resets/)).toBeInTheDocument();
  expect(invoke).not.toHaveBeenCalled();
 });
 it('does not invent usage for an old backend response or silently retry unrestricted creation',async()=>{
  invoke.mockResolvedValueOnce({data:{success:true,data:[{id:'old',code:'OLD',campaign_name:'Old campaign',percent_off:50,active:true}]}});
  render(<AdminPromotions/>);fireEvent.click(screen.getByRole('button',{name:'Load campaigns'}));
  expect(await screen.findByText('Usage reporting is unavailable for this campaign response.')).toBeInTheDocument();
  invoke.mockResolvedValueOnce({data:{error:'Unsupported action.'}});details();fireEvent.click(screen.getByRole('button',{name:'Create promo code'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported action.');
  expect(invoke.mock.calls.filter(([,args])=>args.body.action==='create')).toHaveLength(0);
 });
 it('preserves used and reserved reporting when an existing campaign is paused',async()=>{
  const record={...created,usage_limit:3,used:2,reserved:1};
  invoke.mockResolvedValueOnce({data:{success:true,data:[record]}}).mockResolvedValueOnce({data:{success:true,data:{...record,active:false}}});
  render(<AdminPromotions/>);fireEvent.click(screen.getByRole('button',{name:'Load campaigns'}));
  fireEvent.click(await screen.findByRole('button',{name:'Pause'}));await screen.findByRole('button',{name:'Reactivate'});
  for (const [label,value] of [['Allocated','3'],['Used','2'],['Reserved','1'],['Remaining','0']]) expect(screen.getByRole('definition',{name:label})).toHaveTextContent(value);
 });
});
