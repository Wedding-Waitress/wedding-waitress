import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { CustomerEntitlementGate } from './CustomerEntitlementGate';
const mocks=vi.hoisted(()=>({access:{state:null as any,checking:false,error:false,refresh:vi.fn()},signOut:vi.fn()}));
vi.mock('@/hooks/useCustomerEntitlement',()=>({useCustomerEntitlement:()=>mocks.access}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{signOut:mocks.signOut}}}));
const show=(enabled=true)=>render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>
 <CustomerEntitlementGate userId="customer" enabled={enabled}><p>Protected event content</p></CustomerEntitlementGate>
</MemoryRouter></QueryClientProvider>);
beforeEach(()=>{mocks.access.state=null;mocks.access.checking=false;mocks.access.error=false;mocks.access.refresh.mockClear();mocks.signOut.mockReset();});
it('shows all three packages or exit when the trial ended, never protected content',()=>{
 mocks.access.state={status:'trial_expired',kind:'trial'};show();
 expect(screen.getByRole('heading',{name:'Your seven-day trial has ended'})).toBeInTheDocument();
 expect(screen.getAllByRole('radio')).toHaveLength(3);expect(screen.getByRole('button',{name:'Exit / Not Now'})).toBeEnabled();
 expect(screen.queryByText('Protected event content')).not.toBeInTheDocument();expect(mocks.signOut).not.toHaveBeenCalled();
});
it('offers retry, not content or a fabricated expired state, when access cannot be verified',()=>{
 mocks.access.error=true;show();expect(screen.getByRole('alert')).toHaveTextContent('No paid or trial access');
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));expect(mocks.access.refresh).toHaveBeenCalledOnce();
 expect(screen.queryByRole('radio')).not.toBeInTheDocument();expect(screen.queryByText('Protected event content')).not.toBeInTheDocument();
});
it('blocks package selection on an administrator hold',()=>{
 mocks.access.state={status:'admin_blocked',kind:'paid'};show();
 expect(screen.getByText(/Purchasing a package cannot release/)).toBeInTheDocument();
 expect(screen.queryByRole('radio')).not.toBeInTheDocument();expect(screen.queryByText('Protected event content')).not.toBeInTheDocument();
});
it('keeps existing application behavior until the matching backend is verified and enabled',()=>{
 show(false);expect(screen.getByText('Protected event content')).toBeInTheDocument();
});
