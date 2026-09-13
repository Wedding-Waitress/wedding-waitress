import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import AccountRecovery from './AccountRecovery';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),signOut:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture-user'}}}}),signOut:mocks.signOut},rpc:mocks.rpc}}));
vi.mock('@/components/SEO/SeoHead',()=>({SeoHead:()=>null}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
beforeEach(()=>mocks.rpc.mockReset());
it('admin-deleted customers receive a notice and cannot self-reactivate',async()=>{
 mocks.rpc.mockResolvedValue({data:{status:'scheduled_for_deletion',admin_deleted_at:'2026-09-12',purge_after:'infinity'},error:null});
 render(<MemoryRouter><AccountRecovery/></MemoryRouter>);
 await screen.findByRole('heading',{name:'This account has been deactivated'});
 expect(screen.queryByRole('button',{name:'Reactivate My Account'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Log Out'})).toBeEnabled();
 expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it('retains the existing customer-initiated closure recovery control',async()=>{
 mocks.rpc.mockResolvedValue({data:{status:'scheduled_for_deletion',admin_deleted_at:null,purge_after:'2027-09-12'},error:null});
 render(<MemoryRouter><AccountRecovery/></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Reactivate My Account'})).toBeEnabled();
});
it('offers reopening without repayment for a server-verified remaining original term',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:{status:'scheduled_for_deletion',ordinary_closed_at:'2026-08-01',purge_after:'infinity'},error:null})
  .mockResolvedValueOnce({data:{account_closed:true,admin_blocked:false,paid_until:'2027-01-09T00:00:00Z',server_now:'2026-08-09T00:00:00Z',can_reopen:true,renewal_required:false},error:null});
 render(<MemoryRouter><AccountRecovery/></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Reopen My Account'})).toBeEnabled();
 expect(screen.getByText(/without paying again/)).toBeInTheDocument();
 expect(screen.queryByRole('radio')).not.toBeInTheDocument();
 expect(mocks.rpc).toHaveBeenNthCalledWith(2,'get_my_account_return_eligibility');
});
it('shows the original remaining trial without advertising a new free trial',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:{status:'scheduled_for_deletion',ordinary_closed_at:'2026-09-10',purge_after:'infinity'},error:null})
  .mockResolvedValueOnce({data:{account_closed:true,admin_blocked:false,paid_until:null,entitlement_kind:'trial',entitlement_until:'2026-09-14T00:00:00Z',server_now:'2026-09-12T00:00:00Z',can_reopen:true,renewal_required:false},error:null});
 render(<MemoryRouter><AccountRecovery/></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Reopen My Account'})).toBeEnabled();
 expect(screen.getByText(/without restarting your trial/)).toBeInTheDocument();
 expect(screen.queryByRole('radio')).not.toBeInTheDocument();
 expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it('offers exactly three paid packages or exit after original expiry without starting checkout',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:{status:'scheduled_for_deletion',ordinary_closed_at:'2026-08-01',purge_after:'infinity'},error:null})
  .mockResolvedValueOnce({data:{account_closed:true,admin_blocked:false,paid_until:'2027-01-09T00:00:00Z',server_now:'2027-02-09T00:00:00Z',can_reopen:false,renewal_required:true},error:null});
 render(<MemoryRouter><AccountRecovery/></MemoryRouter>);
 expect(await screen.findAllByRole('radio')).toHaveLength(3);
 expect(screen.queryByRole('button',{name:'Reopen My Account'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Exit / Not Now'})).toBeEnabled();
 expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it('fails closed rather than offering legacy recovery when entitlement lookup fails',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:{status:'scheduled_for_deletion',ordinary_closed_at:'2026-08-01'},error:null})
  .mockResolvedValueOnce({data:null,error:{message:'fixture unavailable'}});
 render(<MemoryRouter><AccountRecovery/></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('No access has been restored');
 expect(screen.queryByRole('button',{name:'Reactivate My Account'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Reopen My Account'})).not.toBeInTheDocument();
});
