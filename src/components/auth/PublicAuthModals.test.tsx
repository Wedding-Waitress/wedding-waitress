import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SignUpModal } from './SignUpModal';
import { SignInModal } from './SignInModal';

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  upsert: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: mocks.signInWithOtp,
      verifyOtp: mocks.verifyOtp,
    },
    from: vi.fn(() => ({ upsert: mocks.upsert })),
    functions: { invoke: mocks.invoke },
  },
}));

const renderInRouter = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('shared public authentication modals', () => {
  beforeEach(() => {
    mocks.signInWithOtp.mockReset().mockResolvedValue({ error: null });
    mocks.verifyOtp.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    mocks.upsert.mockReset().mockResolvedValue({ error: null });
    mocks.invoke.mockReset().mockResolvedValue({ data: { saved: true }, error: null });
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('shows the approved sign-up hierarchy, required fields and legal links', async () => {
    renderInRouter(<SignUpModal><button type="button">Open sign up</button></SignUpModal>);
    fireEvent.click(screen.getByRole('button', { name: 'Open sign up' }));

    expect(await screen.findByRole('heading', { name: 'Create your free account' })).toBeInTheDocument();
    expect(screen.getByText('7-day free trial · Up to 20 guests')).toBeInTheDocument();
    expect(screen.getByText('Start planning your wedding in one connected place.')).toBeInTheDocument();
    expect(screen.getByLabelText('First name *')).toHaveAttribute('autocomplete', 'given-name');
    expect(screen.getByLabelText('Last name *')).toHaveAttribute('autocomplete', 'family-name');
    expect(screen.getByLabelText('Email *')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Mobile *')).toHaveAttribute('autocomplete', 'tel');
    expect(screen.getByRole('button', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it.each(['abc', '0411', '+61 abc 123'])('rejects invalid mobile %s before requesting an email code', async (mobile) => {
    renderInRouter(<SignUpModal><button type="button">Open sign up</button></SignUpModal>);
    fireEvent.click(screen.getByRole('button', { name: 'Open sign up' }));
    fireEvent.change(await screen.findByLabelText('First name *'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Taylor' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText('Mobile *'), { target: { value: mobile } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Free Account & Continue' }));
    expect(await screen.findByText('Please enter a valid mobile number, including its country code if needed.')).toBeInTheDocument();
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Create Free Account & Continue' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Mobile *'), { target: { value: '+61 412 345 678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Free Account & Continue' }));
    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
  });

  it('requests an email OTP for a new account, retaining pricing and promo intent without charging', async () => {
    renderInRouter(
      <SignUpModal selectedPlan={{ key: 'premium', name: 'Premium', currency: 'USD' }}>
        <button type="button">Choose Premium</button>
      </SignUpModal>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Choose Premium' }));
    fireEvent.change(await screen.findByLabelText('First name *'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Taylor' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText('Mobile *'), { target: { value: '+61 412 345 678' } });
    fireEvent.change(screen.getByLabelText('Promo code (optional)'), { target: { value: 'VENUE50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Free Account & Continue' }));

    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'alex@example.com',
      options: { shouldCreateUser: true, data: expect.objectContaining({
        first_name: 'Alex', last_name: 'Taylor', mobile: '+61412345678',
        pending_promo_code: 'VENUE50', intended_plan: 'premium', intended_currency: 'AUD',
      }) },
    }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Verification code digit/)).toHaveLength(6);
    expect(mocks.invoke).not.toHaveBeenCalledWith('register-prelaunch-interest', expect.anything());
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('ww_intended_plan')).toBe('premium');
  });

  it('uses the approved sign-in wording and can return to sign-up', async () => {
    const backToSignUp = vi.fn();
    renderInRouter(<SignInModal open onOpenChange={vi.fn()} onBackToSignUp={backToSignUp} />);

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Continue planning your wedding in one connected place.')).toBeInTheDocument();
    expect(screen.queryByText('Secure password-free sign in')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email Me a Sign-In Code' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create a free account' }));
    expect(backToSignUp).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('keeps the registration form open when the email OTP request is rejected', async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: { message: 'Account registration is unavailable.' } });
    renderInRouter(<SignUpModal><button type="button">Register interest</button></SignUpModal>);
    fireEvent.click(screen.getByRole('button', { name: 'Register interest' }));
    for (const [label,value] of [['First name *','Alex'],['Last name *','Taylor'],['Email *','alex@example.com'],['Mobile *','0412345678']]) fireEvent.change(await screen.findByLabelText(label),{target:{value}});
    fireEvent.click(screen.getByRole('button',{name:'Create Free Account & Continue'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Account registration is unavailable.');
    expect(screen.queryByRole('heading',{name:'Thank you — you’re on our launch list'})).not.toBeInTheDocument();
    expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('shows existing email validation without requesting a sign-in code', async () => {
    renderInRouter(<SignInModal open onOpenChange={vi.fn()} onBackToSignUp={vi.fn()} />);
    const submitButton = await screen.findByRole('button', { name: 'Email Me a Sign-In Code' });

    fireEvent.click(submitButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a valid email address');
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(submitButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a valid email address');
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it('advances sign-in to the same six-digit OTP presentation', async () => {
    renderInRouter(<SignInModal open onOpenChange={vi.fn()} onBackToSignUp={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'host@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email Me a Sign-In Code' }));

    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledWith({ email: 'host@example.com' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Verification code digit/)).toHaveLength(6);
    expect(screen.getByLabelText('Verification code digit 1')).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByRole('button', { name: 'Correct email' })).toBeInTheDocument();
  });

  it('keeps verification disabled until six digits and submits the completed sign-in code', async () => {
    renderInRouter(<SignInModal open onOpenChange={vi.fn()} onBackToSignUp={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'flow-test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email Me a Sign-In Code' }));

    const inputs = await screen.findAllByLabelText(/Verification code digit/);
    const verifyButton = screen.getByRole('button', { name: 'Verify Code' });
    expect(verifyButton).toBeDisabled();

    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      fireEvent.change(inputs[index], { target: { value: digit } });
    });

    expect(verifyButton).toBeEnabled();
    fireEvent.click(verifyButton);
    await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledWith({
      email: 'flow-test@example.com',
      token: '123456',
      type: 'email',
    }));
  });

  it('keeps the shared close control keyboard accessible and supports Escape', async () => {
    const onOpenChange = vi.fn();
    renderInRouter(
      <SignInModal open onOpenChange={onOpenChange} onBackToSignUp={vi.fn()} />,
    );

    const closeButton = await screen.findByRole('button', { name: 'Exit' });
    closeButton.focus();
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
