import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { PaymentSuccess } from './PaymentSuccess';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), startProcessing: vi.fn(), stopProcessing: vi.fn(), clearCaches: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/contexts/PaymentProcessingContext', () => ({ usePaymentProcessing: () => mocks }));
vi.mock('@/lib/cacheRegistry',()=>({clearAllCaches:mocks.clearCaches}));
beforeEach(() => { mocks.invoke.mockReset(); mocks.clearCaches.mockClear(); });
const open = () => render(<MemoryRouter initialEntries={['/payment-success?promotion=1&session_id=cs_fixture']}><PaymentSuccess /></MemoryRouter>);

it('verifies promotional returns separately and explains scheduled access without claiming payment', async () => {
  mocks.invoke.mockResolvedValue({ data: { success: true, type: 'promotion', status: 'scheduled', plan_name: 'Essential', percent_off: 100, included_credits: 0 }, error: null });
  open();
  await screen.findByText('Promotional checkout confirmed');
  expect(mocks.invoke).toHaveBeenCalledWith('verify-promotion-payment', { body: { session_id: 'cs_fixture' } });
  expect(screen.getByText(/package starts after your trial/)).toBeTruthy();
  expect(screen.getByText(/No new included Email & SMS credits/)).toBeTruthy();
  expect(screen.queryByText('Payment Successful! 🎉')).toBeNull();
});

it('does not claim confirmed payment or access after a transport failure', async () => {
  mocks.invoke.mockResolvedValue({ data: null, error: new Error('Unavailable') });
  open();
  await screen.findByText('Awaiting checkout verification');
  expect(screen.queryByText(/purchase is confirmed with Stripe/)).toBeNull();
});

it('rejects an unrelated or incomplete success payload', async () => {
  mocks.invoke.mockResolvedValue({ data: { success: true, type: 'plan', status: 'active' }, error: null });
  open();
  await waitFor(() => expect(screen.getByText('Awaiting checkout verification')).toBeTruthy());
  expect(screen.queryByText('Promotional checkout confirmed')).toBeNull();
});

it('refreshes trial allowances only after an active verified promotion',async()=>{mocks.invoke.mockResolvedValue({data:{success:true,type:'promotion',status:'active',plan_name:'Premium',included_credits:0},error:null});open();await screen.findByText('Promotional checkout confirmed');expect(mocks.clearCaches).toHaveBeenCalledTimes(1);});
it('does not refresh allowances for pending checkout',async()=>{mocks.invoke.mockResolvedValue({data:{status:'pending'},error:null});open();await screen.findByText('Awaiting checkout verification');expect(mocks.clearCaches).not.toHaveBeenCalled();});

it.each(['Unlimited','Ultimate'])('presents %s ordinary paid confirmations as Ultimate and refreshes account caches',async(plan_name)=>{mocks.invoke.mockResolvedValue({data:{type:'plan',status:'active',plan_name},error:null});render(<MemoryRouter initialEntries={['/payment-success?session_id=cs_fixture']}><PaymentSuccess/></MemoryRouter>);await screen.findByText('Your Ultimate plan is now active.');expect(mocks.clearCaches).toHaveBeenCalledTimes(1);expect(screen.queryByText(/Your Unlimited/)).toBeNull();});
it('presents active promotional Ultimate purchases consistently and refreshes confirmed entitlement',async()=>{mocks.invoke.mockResolvedValue({data:{success:true,type:'promotion',status:'active',plan_name:'Unlimited',included_credits:0},error:null});open();await screen.findByText('Your Ultimate promotional package is now active for twelve months.');expect(mocks.clearCaches).toHaveBeenCalledTimes(1);});
