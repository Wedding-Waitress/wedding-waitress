import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  state: {
    session: null as Session | null,
    loading: true,
    error: null as string | null,
    retry: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthenticatedSessionContext', () => ({
  useAuthenticatedSession: () => mocks.state,
}));

import { AuthenticatedRouteGate } from './AuthenticatedRouteGate';

const LandingState = () => {
  const location = useLocation();
  return <div data-testid="landing-state">{JSON.stringify(location.state)}</div>;
};

const renderRoute = (entry = '/dashboard?tab=photo-video-gallery') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/" element={<LandingState />} />
      <Route element={<AuthenticatedRouteGate />}>
        <Route path="/dashboard" element={<div>Protected dashboard content</div>} />
        <Route path="/account/:section?" element={<div>Protected account content</div>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe('AuthenticatedRouteGate', () => {
  beforeEach(() => {
    mocks.state.session = null;
    mocks.state.loading = true;
    mocks.state.error = null;
    mocks.state.retry.mockReset();
  });

  it('does not mount protected dashboard content while authentication is loading', () => {
    renderRoute();

    expect(screen.getByText('Loading Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard content')).not.toBeInTheDocument();
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
    renderRoute('/account/plans-upgrades?from=dashboard');

    expect(screen.getByTestId('landing-state')).toHaveTextContent(
      '"returnTo":"/account/plans-upgrades?from=dashboard"',
    );
  });

  it('mounts the protected route only after authentication and account access complete', () => {
    mocks.state.session = { access_token: 'token', user: { id: 'user-1' } } as Session;
    mocks.state.loading = false;
    renderRoute();

    expect(screen.getByText('Protected dashboard content')).toBeInTheDocument();
  });
});
