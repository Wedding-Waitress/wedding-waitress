import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignInModal } from './SignInModal';
import { SignUpModal } from './SignUpModal';
import { EmbeddedSignUpForm } from './EmbeddedSignUpForm';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), send: vi.fn(), upsert: vi.fn(), begin: vi.fn(), invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { verifyOtp: mocks.verify, signInWithOtp: mocks.send }, from: () => ({ upsert: mocks.upsert }), functions: { invoke: mocks.invoke } } }));
vi.mock('@/lib/prelaunch', () => ({ PRELAUNCH_SIGNUP_HOLD: false, savePrelaunchRegistration: vi.fn() }));
vi.mock('@/lib/guidedEventSetup', () => ({ beginGuidedSetup: mocks.begin }));
const Location = () => <output data-testid="entry-location">{useLocation().pathname}{useLocation().search}</output>;
const open = (node: React.ReactNode) => render(<MemoryRouter initialEntries={['/']}><Location />{node}</MemoryRouter>);
const verify = async () => { const inputs = await screen.findAllByLabelText(/Verification code digit/); inputs.forEach((input, i) => fireEvent.change(input, { target: { value: String(i + 1) } })); fireEvent.click(screen.getByRole('button', { name: 'Verify Code' })); await waitFor(() => expect(screen.getByTestId('entry-location')).toHaveTextContent('/dashboard?tab=my-events')); };
describe('account entry after verified authentication', () => {
    it.each(['essential', 'premium', 'unlimited', 'vendor_pro'] as const)('keeps the selected %s package through signup without initiating payment', async (key) => {
      open(<SignUpModal selectedPlan={{ key, name: 'Essential' }}><button>Register package</button></SignUpModal>);
      fireEvent.click(screen.getByText('Register package'));
      fireEvent.change(await screen.findByLabelText('First name *'), { target: { value: 'Alex' } });
      fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Taylor' } });
      fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'alex@example.com' } });
      fireEvent.change(screen.getByLabelText('Mobile *'), { target: { value: '0412345678' } });
      fireEvent.click(screen.getByRole('button', { name: /Create Free Account/ }));
      const inputs = await screen.findAllByLabelText(/Verification code digit/);
      inputs.forEach((input, i) => fireEvent.change(input, { target: { value: String(i + 1) } }));
      fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }));
      await waitFor(() => expect(screen.getByTestId('entry-location').textContent).toBe(key === 'vendor_pro'
        ? '/dashboard?tab=my-events' : `/dashboard/upgrade/checkout?plan=${key}&currency=AUD`));
      expect(mocks.invoke).toHaveBeenCalledWith('send-transactional-email', { body: {
        templateName: 'welcome', recipientEmail: 'alex@example.com', idempotencyKey: 'welcome-user-1', templateData: { firstName: 'Alex' },
      } });
      expect(mocks.invoke.mock.calls.every(([name]) => name === 'send-transactional-email')).toBe(true);
      expect(sessionStorage.getItem('ww_intended_plan')).toBeNull();
    });

    beforeEach(() => { vi.clearAllMocks(); mocks.send.mockResolvedValue({ error: null }); mocks.verify.mockResolvedValue({ data: { user: { id: 'user-1', created_at: new Date().toISOString() } }, error: null }); mocks.upsert.mockResolvedValue({ error: null }); mocks.begin.mockResolvedValue({ id: 'draft-1' }); mocks.invoke.mockResolvedValue({ data: { accepted: true }, error: null }); });
    it('returns a signing-in user to My Events instead of the previous budget page', async () => { open(<SignInModal open onOpenChange={vi.fn()} onBackToSignUp={vi.fn()} redirectTo="/dashboard?tab=dashboard"/>); fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'host@example.com' } }); fireEvent.click(screen.getByRole('button', { name: 'Email Me a Sign-In Code' })); await verify(); expect(mocks.verify).toHaveBeenCalledWith({ email: 'host@example.com', token: '123456', type: 'email' }); });
    it.each(['modal', 'embedded'])('opens My Events after new-user %s signup verification', async (variant) => { open(variant === 'modal' ? <SignUpModal redirectTo="/dashboard?tab=dashboard"><button>Register</button></SignUpModal> : <EmbeddedSignUpForm />); if (variant === 'modal')
        fireEvent.click(screen.getByText('Register')); fireEvent.change(await screen.findByLabelText('First name *'), { target: { value: 'Alex' } }); fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Taylor' } }); fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'alex@example.com' } }); fireEvent.change(screen.getByLabelText('Mobile *'), { target: { value: '0412345678' } }); fireEvent.click(screen.getByRole('button', { name: /Create Free Account/ })); await verify(); expect(mocks.upsert).toHaveBeenCalled(); expect(mocks.begin).toHaveBeenCalled(); });
});
