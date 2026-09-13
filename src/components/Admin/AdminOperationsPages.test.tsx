import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSupportPage, AdminMessagesCreditsPage, AdminSystemHealthPage, AdminActivityPage, filterOperationalRows, type OperationsSnapshot } from './AdminOperationsPages';
const {invoke}=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
const snapshot:OperationsSnapshot={generated_at:'2026-09-12T00:00:00Z',row_limit:500,records:{tickets:[{id:'ticket1',customer_id:'customer1',event_id:'event1',full_name:'Alice',contact_email:'alice@example.test',category:'planning',message:'Help with my event',status:'open',created_at:'2026-09-12T00:00:00Z'}],customers:[{id:'customer1',first_name:'Alice',last_name:'Smith'}],events:[{id:'event1',name:'Wedding'}],emails:[],guest_notifications:[],balances:[{id:'balance1',user_id:'customer1',event_id:'event1',total:150,used:10,remaining:140}],purchases:[],usage:[],credit_transactions:[],admin_activity:[],lifecycle_activity:[],support_activity:[]},availability:{tickets:'available',emails:'available',guest_notifications:'available',balances:'available',purchases:'available',usage:'unavailable',credit_transactions:'available',admin_activity:'available',lifecycle_activity:'available',support_activity:'available'},queue:{pending:0,processing:0,sent:0,failed:null},configuration:{email_provider_configured:true},limitations:['SMS acceptance is not delivery.']};
beforeEach(()=>{invoke.mockReset();snapshot.records.email_queue=[];snapshot.availability.email_queue='available';sessionStorage.setItem('ww_admin_grant','existing-grant');sessionStorage.setItem('ww_admin_grant_sig','existing-signature');invoke.mockResolvedValue({data:snapshot,error:null});});
const show=(element:React.ReactNode)=>render(<MemoryRouter>{element}</MemoryRouter>);
describe('owner operational pages',()=>{
  it('loads actual tickets using the recent grant and filters without modifying data',async()=>{
    show(<AdminSupportPage/>);await screen.findByText('Alice');expect(invoke).toHaveBeenCalledWith('admin-operations-snapshot',{body:{admin_grant:'existing-grant',admin_grant_signature:'existing-signature'}});
    fireEvent.change(screen.getByLabelText('Search operational records'),{target:{value:'no match'}});expect(screen.getByText('No recorded entries match these filters.')).toBeInTheDocument();expect(invoke).toHaveBeenCalledTimes(1);
  });
  it('shows real ticket details and saves only via audited owner endpoint with a reason',async()=>{
    show(<AdminSupportPage/>);fireEvent.click(await screen.findByText('View details'));expect(screen.getByText('Help with my event')).toBeInTheDocument();
    const save=screen.getByRole('button',{name:'Save status'});expect(save).toBeDisabled();fireEvent.change(screen.getByLabelText('Status'),{target:{value:'resolved'}});fireEvent.change(screen.getByLabelText('Reason for this audited change'),{target:{value:'Issue resolved with the owner'}});
    invoke.mockResolvedValueOnce({data:{success:true},error:null});fireEvent.click(save);
    await waitFor(()=>expect(invoke).toHaveBeenCalledWith('admin-account-action',{body:expect.objectContaining({action:'set_support_ticket_status',target_id:'ticket1',status:'resolved',reason:'Issue resolved with the owner',admin_grant:'existing-grant'})}));
  });
  it('distinguishes absent records from an unavailable cross-account source',async()=>{
    show(<AdminMessagesCreditsPage/>);expect(await screen.findByText('140')).toBeInTheDocument();expect(screen.getByText('This source could not be read. Its data is unknown.')).toBeInTheDocument();expect(screen.getAllByText('No entries have been recorded in this source.').length).toBeGreaterThan(0);
  });
  it('does not infer health from a failed read and provides retry',async()=>{
    invoke.mockResolvedValueOnce({data:null,error:new Error('Unavailable')});show(<AdminSystemHealthPage/>);expect(await screen.findByRole('alert')).toHaveTextContent('Reporting unavailable');expect(screen.queryByText('Configured')).not.toBeInTheDocument();fireEvent.click(screen.getByText('Refresh'));expect(await screen.findByText('Configured')).toBeInTheDocument();expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
  it('keeps actual activity sources separate with honest empty states',async()=>{
    show(<AdminActivityPage/>);await screen.findByText('Administrator actions');expect(screen.getAllByText('No entries have been recorded in this source.')).toHaveLength(3);
  });
  it('filters by either workflow channel or audit outcome',()=>{
    expect(filterOperationalRows([{id:'1',sms_status:'failed'},{id:'2',result:'succeeded'}],'','failed')).toHaveLength(1);expect(filterOperationalRows([{id:'1',result:'succeeded'}],'','succeeded')).toHaveLength(1);
  });
  it('searches the actual displayed customer and event context as well as IDs',()=>{expect(filterOperationalRows([{id:'1',user_id:'customer1'}],'Alice','',()=> 'Alice Smith Wedding')).toHaveLength(1);});
  it('shows recorded access-change actor, reason, outcome and time without creating a retry',async()=>{
    invoke.mockResolvedValueOnce({data:{...snapshot,records:{...snapshot.records,admin_activity:[{id:'audit1',administrator_id:'customer1',action:'suspend',target_type:'account',target_id:'target-account',reason:'Owner reviewed the account access',result:'failed',created_at:'2026-09-12T00:00:00Z'}]}},error:null});
    show(<AdminActivityPage/>);
    expect(await screen.findByText('Owner reviewed the account access')).toBeInTheDocument();
    expect(screen.getByRole('cell',{name:'failed'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/retry/i})).not.toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it('shows actual failed delivery attempts without replaying jobs or exposing payloads',async()=>{
    invoke.mockResolvedValueOnce({data:{...snapshot,records:{...snapshot.records,email_queue:[{id:42,queue_name:'transactional-email',status:'failed',attempts:5,available_at:'2026-09-12T00:00:00Z',locked_at:null,updated_at:'2026-09-12T00:01:00Z'}]}},error:null});
    show(<AdminMessagesCreditsPage/>);
    expect(await screen.findByText('transactional-email')).toBeInTheDocument();
    expect(screen.getByRole('cell',{name:'failed'})).toBeInTheDocument();expect(screen.getByRole('cell',{name:'5'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/retry|send|replay/i})).not.toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it('recovers only a reviewed failed session-revocation step using its audit ID',async()=>{
    invoke.mockResolvedValueOnce({data:{...snapshot,records:{...snapshot.records,admin_activity:[{id:'failure-audit',administrator_id:'customer1',action:'blocked_account_session_revocation',target_type:'account',target_id:'target-account',reason:'Initial revocation failed',result:'failed'}]}},error:null});
    show(<AdminActivityPage/>);fireEvent.click(await screen.findByText('View details'));
    const retry=screen.getByRole('button',{name:'Retry session revocation'});expect(retry).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason for session recovery'),{target:{value:'Owner reviewed the still blocked account'}});expect(retry).toBeDisabled();
    fireEvent.click(screen.getByLabelText('I have reviewed the failed operation and the current account.'));
    invoke.mockResolvedValueOnce({data:{success:true,result:{result:'recovered'}},error:null});fireEvent.click(retry);
    await waitFor(()=>expect(invoke).toHaveBeenCalledWith('admin-account-action',{body:expect.objectContaining({action:'retry_failed_session_revocation',target_id:'failure-audit',reviewed_failure:true,reason:'Owner reviewed the still blocked account',admin_grant:'existing-grant'})}));
    await waitFor(()=>expect(screen.queryByRole('button',{name:'Retry session revocation'})).not.toBeInTheDocument());
  });
  it('requires a new review after failed recovery rather than automatic replay',async()=>{
    invoke.mockResolvedValueOnce({data:{...snapshot,records:{...snapshot.records,admin_activity:[{id:'failure-audit',action:'blocked_account_session_revocation',target_type:'account',target_id:'target-account',result:'failed'}]}},error:null});
    show(<AdminActivityPage/>);fireEvent.click(await screen.findByText('View details'));
    fireEvent.change(screen.getByLabelText('Reason for session recovery'),{target:{value:'Owner reviewed the current account'}});fireEvent.click(screen.getByLabelText('I have reviewed the failed operation and the current account.'));
    invoke.mockResolvedValueOnce({data:{success:false,error:'Account is no longer blocked'},error:null});fireEvent.click(screen.getByRole('button',{name:'Retry session revocation'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Account is no longer blocked');expect(screen.getByRole('button',{name:'Retry session revocation'})).toBeDisabled();expect(invoke).toHaveBeenCalledTimes(2);
  });
});
