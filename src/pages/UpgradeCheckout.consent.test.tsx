import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { UpgradeCheckout } from './UpgradeCheckout';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), getSession: vi.fn(), toast: vi.fn(), startProcessing: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.getSession }, functions: { invoke: mocks.invoke } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/contexts/PaymentProcessingContext', () => ({ usePaymentProcessing: () => ({ processing: false, startProcessing: mocks.startProcessing }) }));
vi.mock('@/lib/packagePricing', async (original) => ({ ...(await original<any>()), PACKAGE_CHECKOUT_AVAILABLE: true }));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn(async () => null) }));
vi.mock('@stripe/react-stripe-js', () => ({ EmbeddedCheckoutProvider: ({ children }: any) => children,
  EmbeddedCheckout: () => <p>Verified checkout panel</p> }));
const show = () => render(<MemoryRouter initialEntries={['/account-renewal-checkout?plan=essential&purpose=renewal']}>
  <Link to="/account-renewal-checkout?plan=premium&purpose=renewal">Choose Premium instead</Link><UpgradeCheckout />
</MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'isolated-session' } } });
  mocks.invoke.mockResolvedValue({ data: { client_secret: 'isolated-client-secret', publishable_key: 'pk_test_Isolated' }, error: null });
});
it('never starts checkout from a login or direct renewal URL without explicit confirmation', async () => {
  show();
  expect(screen.getByRole('heading', { name: 'Confirm Essential Plan checkout' })).toBeInTheDocument();
  expect(mocks.getSession).not.toHaveBeenCalled();
  expect(mocks.invoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'I agree — continue to checkout' }));
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
  expect(mocks.invoke).toHaveBeenCalledWith('create-checkout', expect.objectContaining({ body: expect.objectContaining({
    plan_type: 'essential', plan_purchase_purpose: 'renewal', purchase_consent: true, pricing_currency: 'AUD' }) }));
  expect(await screen.findByText('Verified checkout panel')).toBeInTheDocument();
});
it('binds consent and loaded checkout to the exact selection, hiding an old checkout after a plan change', async () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'I agree — continue to checkout' }));
  await screen.findByText('Verified checkout panel');
  fireEvent.click(screen.getByRole('link', { name: 'Choose Premium instead' }));
  expect(screen.getByRole('heading', { name: 'Confirm Premium Plan checkout' })).toBeInTheDocument();
  expect(screen.queryByText('Verified checkout panel')).not.toBeInTheDocument();
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
  mocks.invoke.mockImplementation(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole('button', { name: 'I agree — continue to checkout' }));
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Verified checkout panel')).not.toBeInTheDocument();
});
