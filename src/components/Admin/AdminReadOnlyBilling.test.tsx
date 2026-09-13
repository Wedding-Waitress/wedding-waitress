import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mock.invoke } } }));
import { AdminReadOnlyBilling } from './AdminReadOnlyBilling';
const data = { state: 'available', read_only: true, ownerId: 'owner', mode: 'test', paymentMethods: [{ brand: 'visa', last4: '4242' }], paymentMethodsTruncated: false, history: [{ id: 'in_recorded', date: '2026-09-12T00:00:00Z', amountMinor: 19900, currency: 'aud', status: 'paid' }], nextCursor: null };
describe('readonly billing display', () => {
  beforeEach(() => { mock.invoke.mockReset().mockResolvedValue({ data, error: null }); });
  it('shows actual masked records with no portal or payment actions', async () => {
    render(<AdminReadOnlyBilling ownerId="owner" />); await screen.findByText('visa ending 4242');
    expect(mock.invoke).toHaveBeenCalledWith('admin-customer-preview-billing', expect.objectContaining({ body: expect.objectContaining({ customer_id: 'owner' }) }));
    expect(screen.getByText(/Test — not live payment evidence/)).toBeInTheDocument(); expect(screen.queryByRole('link')).not.toBeInTheDocument(); expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it.each([{ state: 'provider_unavailable' }, { ...data, ownerId: 'foreign' }, { ...data, read_only: false }, { ...data, history: [{ ...data.history[0], amountMinor: -1 }] }])('does not invent billing history for unverified sources (%j)', async invalid => {
    mock.invoke.mockResolvedValue({ data: invalid, error: null }); render(<AdminReadOnlyBilling ownerId="owner" />);
    await screen.findByText(/does not mean the account has no past payments/); expect(screen.queryByText('visa ending 4242')).not.toBeInTheDocument();
  });
  it('hides cached billing immediately while checking access on focus', async () => {
    render(<AdminReadOnlyBilling ownerId="owner" />); await screen.findByText('visa ending 4242');
    let resolve!: (value: unknown) => void; mock.invoke.mockImplementation(() => new Promise(value => { resolve = value; }));
    act(() => window.dispatchEvent(new Event('focus'))); expect(screen.queryByText('visa ending 4242')).not.toBeInTheDocument();
    await act(async () => resolve({ data: null, error: new Error('denied') })); await screen.findByText(/does not mean the account has no past payments/);
  });
  it('fetches explicit next-page history with a fresh grant', async () => {
    mock.invoke.mockResolvedValue({ data: { ...data, nextCursor: 'in_recorded' }, error: null }); render(<AdminReadOnlyBilling ownerId="owner" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Next invoice page' }));
    await waitFor(() => expect(mock.invoke).toHaveBeenCalledWith('admin-customer-preview-billing', expect.objectContaining({ body: expect.objectContaining({ cursor: 'in_recorded' }) })));
  });
});
