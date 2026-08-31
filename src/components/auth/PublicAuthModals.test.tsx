import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SignUpModal } from './SignUpModal';
import { SignInModal } from './SignInModal';

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  signInWithPassword: vi.fn(),
  verifyOtp: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: mocks.signInWithOtp,
      signInWithPassword: mocks.signInWithPassword,
      verifyOtp: mocks.verifyOtp,
    },
    from: vi.fn(() => ({ upsert: mocks.upsert })),
  },
}));

const renderInRouter = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('shared public authentication modals', () => {
  beforeEach(() => {
    mocks.signInWithOtp.mockReset().mockResolvedValue({ error: null });
    mocks.signInWithPassword.mockReset().mockResolvedValue({ data: { user: { id: 'qa-user' } }, error: null });
    mocks.verifyOtp.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    mocks.upsert.mockReset().mockResolvedValue({ error: null });
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
    expect(screen.getByText('No credit card required')).toBeInTheDocument();
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

  it('retains pricing intent and advances sign-up to the shared OTP experience', async () => {
    renderInRouter(
      <SignUpModal selectedPlan={{ key: 'premium', name: 'Premium', currency: 'USD' }}>
        <button type="button">Choose Premium</button>
      </SignUpModal>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Choose Premium' }));
    fireEvent.change(await screen.findByLabelText('First name *'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Taylor' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText('Mobile *'), { target: { value: '0412 345 678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Free Account & Continue' }));

    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'alex@example.com',
      options: {
        shouldCreateUser: true,
        data: expect.objectContaining({ mobile: '0412 345 678', intended_plan: 'premium', intended_currency: 'USD' }),
      },
    }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getAllByText(/alex@example\.com/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Resend available in/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Correct email' })).toBeInTheDocument();
    expect(sessionStorage.getItem('ww_intended_plan')).toBe('premium');
    expect(sessionStorage.getItem('ww_intended_currency')).toBe('USD');
  });

  it('uses the approved sign-in wording and can return to sign-up', async () => {
    const backToSignUp = vi.fn();
    renderInRouter(<SignInModal open onOpenChange={vi.fn()} onBackToSignUp={backToSignUp} />);

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Continue planning your wedding in one connected place.')).toBeInTheDocument();
    expect(screen.queryByText('Secure password-free sign in')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email Me a Sign-In Code' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create a free account' }));
    expect(backToSignUp).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
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

  it('enables email and password sign-in only for a QA-flagged build', async () => {
    vi.stubEnv('VITE_QA_PASSWORD_LOGIN', 'true');
    const onOpenChange = vi.fn();
    renderInRouter(<SignInModal open onOpenChange={onOpenChange} onBackToSignUp={vi.fn()} />);

    expect(await screen.findByText('Use the temporary QA credentials to continue.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'qa@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'temporary-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Temporary Password' }));

    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'qa@example.com',
      password: 'temporary-password',
    }));
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
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
