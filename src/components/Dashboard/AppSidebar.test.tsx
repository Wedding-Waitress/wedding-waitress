import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: false }) }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => ({ plan: { plan_name: 'Free' } }) }));
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { first_name: 'Nader', last_name: 'Elalfy', email: 'nader@example.com' } }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock('@/components/Admin/AdminOtpModal', () => ({ AdminOtpModal: () => null }));

describe('dashboard sidebar navigation control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    document.cookie = 'sidebar:state=true; path=/';
  });

  it.each([1280, 768, 390])('uses the table-first workflow order at %ipx', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });

    render(
      <SidebarProvider>
        <SidebarTrigger aria-label="Open menu" />
        <AppSidebar activeTab="dashboard" onTabChange={vi.fn()} onSignOut={vi.fn()} />
      </SidebarProvider>,
    );

    if (width <= 768) {
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      await screen.findByRole('button', { name: 'Collapse Menu' });
    }

    const navigationNames = screen.getAllByRole('button').map((button) => button.textContent?.replace(/\s+/g, ' ').trim());
    const workflowNames = navigationNames.filter((name) =>
      name && ['Event Budget Planner', 'My Events', 'Tables', 'Guest List', 'QR Code Seating Chart']
        .some((label) => name.startsWith(label)),
    );
    expect(workflowNames.slice(0, 5)).toEqual([
      'Event Budget Planner',
      'My EventsStart Here1',
      'TablesCreate2',
      'Guest ListAdd3',
      'QR Code Seating Chart',
    ]);
  });

  it('keeps only account and logout actions in the non-admin profile menu', async () => {
    render(
      <SidebarProvider>
        <AppSidebar activeTab="dashboard" onTabChange={vi.fn()} onSignOut={vi.fn()} />
      </SidebarProvider>,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: /Nader Elalfy/ }), { button: 0, ctrlKey: false });
    expect(await screen.findByRole('menuitem', { name: 'My Account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log Out' })).toBeInTheDocument();
    expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Get Help')).not.toBeInTheDocument();
    expect(screen.queryByText('Referral / Affiliate Rewards')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'My Account' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/account/account-info');
  });

  it('collapses, expands and keeps navigation active from the icon rail', async () => {
    const onTabChange = vi.fn();

    render(
      <SidebarProvider>
        <AppSidebar activeTab="dashboard" onTabChange={onTabChange} onSignOut={vi.fn()} />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Menu' }));
    expect(await screen.findByRole('button', { name: 'Expand Menu' })).toBeInTheDocument();
    await waitFor(() => expect(document.cookie).toContain('sidebar:state=false'));

    fireEvent.click(screen.getByRole('button', { name: 'Photo & Video Sharing' }));
    expect(onTabChange).toHaveBeenCalledWith('photo-video-gallery');

    fireEvent.click(screen.getByRole('button', { name: 'Expand Menu' }));
    expect(await screen.findByRole('button', { name: 'Collapse Menu' })).toBeInTheDocument();
    await waitFor(() => expect(document.cookie).toContain('sidebar:state=true'));
  });

  it.each([768, 390])('opens and closes the off-screen menu at %ipx', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });

    render(
      <SidebarProvider>
        <SidebarTrigger aria-label="Open menu" />
        <AppSidebar activeTab="dashboard" onTabChange={vi.fn()} onSignOut={vi.fn()} />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const closeControl = await screen.findByRole('button', { name: 'Collapse Menu' });
    fireEvent.click(closeControl);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Collapse Menu' })).not.toBeInTheDocument());
  });
});
