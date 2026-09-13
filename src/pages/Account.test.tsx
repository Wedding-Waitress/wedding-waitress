import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Account } from './Account';

const accountCss = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Account.module.css'), 'utf8');
const teamAccessCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Account/TeamAccessDialog.module.css'), 'utf8');
const securityCardSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Account/SecurityCard.tsx'), 'utf8');

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
  refreshAccountBilling: mocks.refetch,
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));

vi.mock('@/components/Account/AccountInfoCard', () => ({ AccountInfoCard: () => <div>Account Info content</div> }));
vi.mock('@/components/Account/AccountAccessCard', () => ({ AccountAccessCard: () => <div>Access Team content</div> }));
vi.mock('@/components/Account/SecurityCard', () => ({ SecurityCard: () => <div>Security content</div> }));
vi.mock('@/components/Account/AccountDestinations', () => ({
  HelpSupportSection: () => <div>Help Support content</div>,
}));
vi.mock('@/components/Account/PlanBillingSection', () => ({ PlanBillingSection: () => <><div>Current Plan content</div><div>Billing Details content</div><div>Invoices History content</div></> }));

const renderAccount = (initialEntry: string) => {
  const router = createMemoryRouter([
    { path: '/account/:section?', element: <Account /> },
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
    expect(screen.getByText('Security content')).toBeInTheDocument();
    expect(document.querySelector('[data-account-info-stack]')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account/account-info');
    expect(screen.queryByText('My Events')).not.toBeInTheDocument();
    expect(screen.queryByText('Tables')).not.toBeInTheDocument();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('shows only the routed section and restores it on a direct load', async () => {
    renderAccount('/account/plan-billing');

    expect(await screen.findByText('Current Plan content')).toBeInTheDocument();
    expect(screen.getByText('Billing Details content')).toBeInTheDocument();
    expect(screen.getByText('Invoices History content')).toBeInTheDocument();
    expect(screen.queryByText('Account Info content')).not.toBeInTheDocument();
  });

  it('keeps the Help & Support route and navigation while leaving its page body empty', async () => {
    const router = renderAccount('/account/help-support');
    const link = await screen.findByRole('link', { name: 'Help & Support' });
    expect(router.state.location.pathname).toBe('/account/help-support');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('Help Support content')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Help & Support' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-empty-account-page="true"]')).toBeInTheDocument();
  });

  it('shows exactly four Account Centre destinations with security integrated into Account Info', async () => {
    renderAccount('/account/account-info');
    await screen.findByText('Account Info content');
    expect(screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/account/'))).toHaveLength(4);
    expect(screen.getByText('Security content')).toBeInTheDocument();
    for (const removed of ['Notifications & Communication', 'Subscription', 'Billing', 'Usage', 'History', 'Privacy & Data', 'Plans & Upgrades', 'Security & Account']) {
      expect(screen.queryByRole('link', { name: removed })).not.toBeInTheDocument();
    }
  });

  it('uses a 70/30 Account Info and Security desktop split with matching heights and stacks on narrow screens', () => {
    expect(accountCss).toMatch(/\.accountInfoStack \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 7fr\) minmax\(0, 3fr\);[^}]*align-items: stretch;[^}]*gap: 24px;/);
    expect(accountCss).toMatch(/\.accountInfoStack > :global\(\[data-account-section\]\) \{[^}]*min-width: 0;[^}]*height: 100%;/);
    expect(accountCss).toMatch(/@media \(max-width: 1023px\) \{\s*\.accountInfoStack \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });

  it('matches the main dashboard horizontal gutters at every responsive breakpoint', async () => {
    renderAccount('/account/account-info');
    await screen.findByText('Account Info content');
    expect(accountCss).toMatch(/\.main \{[^}]*padding: clamp\(36px, 5vw, 74px\) 32px 64px;/);
    expect(accountCss).toMatch(/\.pageHeader, \.contentPanel \{ width: 100%; max-width: none; margin-right: 0; margin-left: 0; \}/);
    expect(accountCss).not.toContain('max-width: 1180px');
    expect(accountCss).toMatch(/@media \(max-width: 1023px\)[\s\S]*\.main \{[^}]*padding: 92px 24px 48px;/);
    expect(accountCss).toMatch(/@media \(max-width: 767px\)[\s\S]*\.main \{[^}]*padding-right: 16px;[^}]*padding-left: 16px;/);
    expect(accountCss).toMatch(/@media \(max-width: 639px\)[\s\S]*\.main \{[^}]*padding: 84px 12px 30px;/);
  });

  it('matches the shared top-level Account Centre card radius to the Team roster header reference', () => {
    expect(teamAccessCss).toMatch(/\.tableHeader \{[^}]*border-radius:10px;/);
    expect(accountCss).toMatch(/\.contentPanel :global\(\[data-account-section\]\) \{[^}]*border-radius: 10px !important;/);
    expect(accountCss).toMatch(/@media \(max-width: 639px\)[\s\S]*\.contentPanel :global\(\[data-account-section\]\) \{[^}]*border-radius: 10px !important;/);
  });

  it('splits security and account closure into two independently headed cards in the right column', () => {
    expect(securityCardSource).toContain('data-account-security-stack');
    expect(securityCardSource.match(/<SectionCard /g)).toHaveLength(2);
    expect(securityCardSource).toContain('title="Security & Password" description="Password and email verification"');
    expect(securityCardSource).toContain('title="Close Account" description="Account deactivation and reopening controls"');
    expect(securityCardSource).toContain('<ChangePasswordModal open={open} onOpenChange={setOpen} />');
    expect(securityCardSource).toContain('<MasterOnly fallback="hide">');
    expect(securityCardSource).toContain('<DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} email={email} />');
  });

  it.each([
    ['/account/notifications', '/account/account-info'],
    ['/account/subscription', '/account/plan-billing'],
    ['/account/billing', '/account/plan-billing'],
    ['/account/usage', '/account/plan-billing'],
    ['/account/history', '/account/plan-billing'],
    ['/account/privacy-data', '/account/account-info'],
    ['/account/security', '/account/account-info'],
    ['/account/security-account', '/account/account-info'],
    ['/account/access-team', '/account/team-access'],
    ['/account/plans-upgrades', '/account/plan-billing'],
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

  it('keeps the Account Centre shell mounted while section content changes', async () => {
    renderAccount('/account/account-info');
    await screen.findByText('Account Info content');
    const shell = document.querySelector('[data-account-shell]');

    fireEvent.click(screen.getByRole('link', { name: 'Plan & Billing' }));
    expect(screen.getByRole('link', { name: 'Plan & Billing' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText('Billing Details content')).toBeInTheDocument();
    expect(document.querySelector('[data-account-shell]')).toBe(shell);
  });

  it('keeps log out separate and signs out before leaving', async () => {
    renderAccount('/account/account-info');
    await screen.findByText('Security content');

    fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });
});
