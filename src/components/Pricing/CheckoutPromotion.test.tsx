import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutPromotion } from './CheckoutPromotion';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser }, functions: { invoke: mocks.invoke } } }));
describe('sign-up to package promotional handoff', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: null } }); });
  it('pre-fills metadata only as input and does not redeem or validate automatically', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { user_metadata: { pending_promo_code: 'VENUE50' } } } });
    const change = vi.fn(); render(<CheckoutPromotion planKey="essential" onCodeChange={change} />);
    await waitFor(() => expect(screen.getByLabelText('Promo code (optional)')).toHaveValue('VENUE50'));
    expect(change).toHaveBeenCalledWith('VENUE50'); expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('shows a server-verified matching offer with its exact credit policy', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true, quote: { code: 'VENUE51', plan_key: 'essential', percent_off: 51, currency: 'AUD', subtotal_cents: 9751, included_credits: 0 } } });
    render(<CheckoutPromotion planKey="essential" onCodeChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Promo code (optional)'), { target: { value: 'venue51' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check offer' }));
    expect(await screen.findByRole('status')).toHaveTextContent('0 included shared email/SMS credits');
    expect(mocks.invoke).toHaveBeenCalledWith('validate-promotion', { body: { code: 'VENUE51', plan_key: 'essential', purpose: 'new_plan' } });
  });
  it('refuses malformed server offers', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true, quote: { code: 'VENUE51', plan_key: 'essential', percent_off: 51, currency: 'AUD', subtotal_cents: 9751, included_credits: 150 } } });
    render(<CheckoutPromotion planKey="essential" onCodeChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Promo code (optional)'), { target: { value: 'VENUE51' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check offer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('shows a non-2xx server rejection without granting an offer', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: 'This offer could not be verified for your first package purchase.' }), { status: 400 }) } });
    render(<CheckoutPromotion planKey="essential" onCodeChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Promo code (optional)'), { target: { value: 'PAUSED51' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check offer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This offer could not be verified for your first package purchase.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('does not replace a new code with an older validation response', async () => {
    let resolve!: (value: unknown) => void;
    mocks.invoke.mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<CheckoutPromotion planKey="essential" onCodeChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Promo code (optional)'), { target: { value: 'OLD50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check offer' }));
    fireEvent.change(screen.getByLabelText('Promo code (optional)'), { target: { value: 'NEW51' } });
    resolve({ data: { success: true, quote: { code: 'OLD50', plan_key: 'essential', percent_off: 50, currency: 'AUD', subtotal_cents: 9950, included_credits: 150 } } });
    await waitFor(() => expect(screen.getByLabelText('Promo code (optional)')).toHaveValue('NEW51'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
