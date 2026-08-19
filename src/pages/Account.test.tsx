import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Account } from './Account';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  refetch: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/hooks/useDashboardSession', () => ({
  useDashboardSession: () => ({ session: { user: { id: 'user-1' } }, loading: false }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { first_name: 'Nader', last_name: 'Elalfy', email: 'nader@example.com' },
  }),
}));

vi.mock('@/hooks/useAccountBilling', () => ({
  useAccountBilling: () => ({ refetch: mocks.refetch }),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));

vi.mock('@/components/Account/AccountInfoCard', () => ({ AccountInfoCard: () => <div>Account Info content</div> }));
vi.mock('@/components/Account/AccountAccessCard', () => ({ AccountAccessCard: () => <div>Access Team content</div> }));
vi.mock('@/components/Account/SecurityCard', () => ({ SecurityCard: () => <div>Security content</div> }));
vi.mock('@/components/Account/AccountDestinations', () => ({
  PlansUpgradesSection: () => <div>Plans Upgrades content</div>,
  HelpSupportSection: () => <div>Help Support content</div>,
}));
vi.mock('@/components/Account/PlanBillingSection', () => ({ PlanBillingSection: () => <><div>Current Plan content</div><div>Billing Details content</div><div>Invoices History content</div></> }));

const renderAccount = (initialEntry: string) => {
  const router = createMemoryRouter([
    { path: '/account', element: <Account /> },
    { path: '/account/:section', element: <Account /> },
    { path: '/dashboard', element: <div>Dashboard restored</div> },
    { path: '/', element: <div>Signed out</div> },
  ], { initialEntries: [initialEntry] });
  render(<RouterProvider router={router} />);
  return router;
};

describe('Account Centre routing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens Account Info by default without the product navigation', async () => {
    const router = renderAccount('/account');

    expect(await screen.findByText('Account Info content')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account/account-info');
    expect(screen.queryByText('My Events')).not.toBeInTheDocument();
    expect(screen.queryByText('Tables')).not.toBeInTheDocument();
  });

  it('shows only the routed section and restores it on a direct load', async () => {
    renderAccount('/account/plan-billing');

    expect(await screen.findByText('Current Plan content')).toBeInTheDocument();
    expect(screen.getByText('Billing Details content')).toBeInTheDocument();
    expect(screen.getByText('Invoices History content')).toBeInTheDocument();
    expect(screen.queryByText('Account Info content')).not.toBeInTheDocument();
  });

  it.each([
    ['/account/plans-upgrades', 'Plans Upgrades content', 'Plans & Upgrades'],
    ['/account/help-support', 'Help Support content', 'Help & Support'],
  ])('restores the new destination at %s', async (route, content, linkName) => {
    const router = renderAccount(route);
    expect(await screen.findByText(content)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(route);
    expect(screen.getByRole('link', { name: linkName })).toHaveAttribute('aria-current', 'page');
  });

  it('shows exactly six Account Centre destinations without removed placeholders', async () => {
    renderAccount('/account/account-info');
    await screen.findByText('Account Info content');
    expect(screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/account/'))).toHaveLength(6);
    for (const removed of ['Notifications & Communication', 'Subscription', 'Billing', 'Usage', 'History', 'Privacy & Data']) {
      expect(screen.queryByRole('link', { name: removed })).not.toBeInTheDocument();
    }
  });

  it.each([
    ['/account/notifications', '/account/account-info'],
    ['/account/subscription', '/account/plan-billing'],
    ['/account/billing', '/account/plan-billing'],
    ['/account/usage', '/account/plan-billing'],
    ['/account/history', '/account/plan-billing'],
    ['/account/privacy-data', '/account/security-account'],
    ['/account/security', '/account/security-account'],
    ['/account/access-team', '/account/team-access'],
  ])('redirects legacy route %s to %s', async (from, to) => {
    const router = renderAccount(from);
    await waitFor(() => expect(router.state.location.pathname).toBe(to));
  });

  it('redirects a saved referral rewards URL to Account Info', async () => {
    const router = renderAccount('/account/referral-rewards');

    expect(await screen.findByText('Account Info content')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account/account-info');
    expect(screen.queryByText('Referral & Affiliate Rewards')).not.toBeInTheDocument();
  });

  it('preserves browser history between sections and returns to the dashboard', async () => {
    const router = renderAccount('/account/account-info');
    await screen.findByText('Account Info content');

    fireEvent.click(screen.getByRole('link', { name: 'Plan & Billing' }));
    expect(await screen.findByText('Billing Details content')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account/plan-billing');

    await router.navigate(-1);
    expect(await screen.findByText('Account Info content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Back to Wedding Waitress' }));
    expect(await screen.findByText('Dashboard restored')).toBeInTheDocument();
  });

  it('keeps log out separate and signs out before leaving', async () => {
    renderAccount('/account/security-account');
    await screen.findByText('Security content');

    fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });
});
