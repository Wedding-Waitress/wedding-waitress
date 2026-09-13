import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  state: {
    session: null as Session | null,
    loading: true,
    error: null as string | null,
    retry: vi.fn(),
    accountAccess: null as {status:'active'|'suspended'|'pending_review';customer_reason?:string}|null,
  },
}));

vi.mock('@/contexts/AuthenticatedSessionContext', () => ({
  useAuthenticatedSession: () => mocks.state,
}));
vi.mock('@/components/Onboarding/FirstEventSetupGate', async () => {
  const { Outlet } = await import('react-router-dom');
  return { FirstEventSetupGate: () => <Outlet /> };
});
vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => ({ loading: false, hasPlatformOwnerAccess: false }),
}));
vi.mock('@/hooks/usePaidAccessState', () => ({
  usePaidAccessState: () => ({ state: { paid_plan: false, expired: false, recoverable: false }, loading: false }),
}));

import { AuthenticatedRouteGate } from './AuthenticatedRouteGate';

const LandingState = () => {
  const location = useLocation();
  return <div data-testid="landing-state">{JSON.stringify(location.state)}</div>;
};

const renderRoute = (entry = '/dashboard?tab=photo-video-gallery') => render(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/" element={<LandingState />} />
      <Route element={<AuthenticatedRouteGate />}>
        <Route path="/dashboard" element={<div>Protected dashboard content</div>} />
        <Route path="/account/:section?" element={<div>Protected account content</div>} />
      </Route>
    </Routes>
  </MemoryRouter></QueryClientProvider>,
);

describe('AuthenticatedRouteGate', () => {
  beforeEach(() => {
    mocks.state.session = null;
    mocks.state.loading = true;
    mocks.state.error = null;
    mocks.state.retry.mockReset();
    mocks.state.accountAccess = null;
  });

  it('does not mount protected dashboard content while authentication is loading', () => {
    renderRoute();

    expect(screen.getByText('Loading Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard content')).not.toBeInTheDocument();
  });

  it('uses the approved dashboard loader styling with Account Centre wording while account auth loads', () => {
    const { container } = renderRoute('/account/plan-billing');

    expect(screen.getByText('Opening Account Centre…')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we prepare your account.')).toBeInTheDocument();
    expect(container.querySelector('[data-loading-appearance="core"]')).toBeInTheDocument();
    expect(screen.queryByText('Loading Dashboard...')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected account content')).not.toBeInTheDocument();
  });

  it('shows the bounded bootstrap failure and retries without mounting protected content', () => {
    mocks.state.loading = false;
    mocks.state.error = 'Session restoration took too long.';
    renderRoute();

    expect(screen.getByRole('alert')).toHaveTextContent('Dashboard couldn’t load');
    expect(screen.queryByText('Protected dashboard content')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(mocks.state.retry).toHaveBeenCalledTimes(1);
  });

  it('redirects signed-out visitors and preserves the complete protected destination', () => {
    mocks.state.loading = false;
    renderRoute('/account/plan-billing?from=dashboard');

    expect(screen.getByTestId('landing-state')).toHaveTextContent(
      '"returnTo":"/account/plan-billing?from=dashboard"',
    );
  });

  it.each(['/dashboard?tab=event-budget','/dashboard?tab=guest-list','/account/team-access'])('blocks protected deep destination %s when suspended', entry => {
    mocks.state.session = {access_token:'token',user:{id:'user-1'}} as Session;
    mocks.state.loading = false;
    mocks.state.accountAccess = {status:'suspended',customer_reason:'Customer access reason'};
    renderRoute(entry);
    expect(screen.getByRole('heading',{name:'Your account is suspended'})).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard content')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected account content')).not.toBeInTheDocument();
  });

  it('mounts the protected route only after authentication and account access complete', () => {
    mocks.state.session = { access_token: 'token', user: { id: 'user-1' } } as Session;
    mocks.state.loading = false;
    renderRoute();

    expect(screen.getByText('Protected dashboard content')).toBeInTheDocument();
  });
});
