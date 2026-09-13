import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { PaymentSuccess } from './PaymentSuccess';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), startProcessing: vi.fn(), stopProcessing: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/contexts/PaymentProcessingContext', () => ({ usePaymentProcessing: () => mocks }));
beforeEach(() => { mocks.invoke.mockReset(); });
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
