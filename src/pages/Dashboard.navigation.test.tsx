import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import photoVideoManagementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

const delayed = vi.hoisted(() => ({
  pending: false,
  promise: null as Promise<void> | null,
  resolve: null as (() => void) | null,
  failed: false,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  SidebarTrigger: () => <button type="button">Open menu</button>,
}));
vi.mock('@/components/Dashboard/AppSidebar', () => ({
  AppSidebar: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
    <aside data-testid="dashboard-sidebar">
      <button aria-current={activeTab === 'qr-code' ? 'page' : undefined} onClick={() => onTabChange('qr-code')}>QR Code Seating Chart</button>
      <button aria-current={activeTab === 'signage' ? 'page' : undefined} onClick={() => onTabChange('signage')}>Seating Chart Signs</button>
      <span data-testid="active-tab">{activeTab}</span>
    </aside>
  ),
}));
vi.mock('@/components/Dashboard/GuestListTable', () => ({
  GuestListTable: ({ selectedEventId, onNavigateToTables }: { selectedEventId: string | null; onNavigateToTables: () => void }) => (
    <section>
      <span data-testid="guest-list-event">{selectedEventId}</span>
      <button type="button" onClick={onNavigateToTables}>Create Tables First</button>
    </section>
  ),
}));
vi.mock('@/components/Dashboard/QRCode/QRCodeSeatingChart', () => ({ QRCodeSeatingChart: () => <h1>QR content</h1> }));
vi.mock('@/components/Dashboard/LiveSlideshow/LiveSlideshowSetup', () => ({ LiveSlideshowSetup: () => <h1>Live Slideshow setup</h1> }));
vi.mock('@/components/Dashboard/Signage/SignagePage', () => ({
  SignagePage: () => {
    if (delayed.pending && delayed.promise) throw delayed.promise;
    if (delayed.failed) return <div role="alert">Signage data unavailable <button onClick={() => { delayed.failed = false; }}>Retry</button></div>;
    return <h1>Signage content</h1>;
  },
}));
vi.mock('@/pages/GalleryViewFeaturePage', () => ({ GalleryViewFeaturePage: () => <h1>Gallery view workspace</h1> }));

vi.mock('@/hooks/useDashboardSession', () => ({ useDashboardSession: () => ({ session: { user: { id: 'user-1' } }, loading: false, error: null, retry: vi.fn() }) }));
vi.mock('@/hooks/useEvents', () => ({ useEvents: () => ({ events: [{ id: 'event-1', name: 'Wedding', event_type: 'seated', guest_limit: 100 }], loading: false, loaded: true, activeEventId: null, setActiveEventId: vi.fn() }) }));
vi.mock('@/hooks/useSelectedEvent', () => ({ useSelectedEvent: () => ({ selectedEventId: 'event-1', selectedEvent: { id: 'event-1', name: 'Wedding', event_type: 'seated', guest_limit: 100 }, status: 'selected', setSelectedEventId: vi.fn() }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: {}, loading: false, error: null }) }));
vi.mock('@/hooks/useTables', () => ({ useTables: () => ({ tables: [], loading: false, createTable: vi.fn(), updateTable: vi.fn(), deleteTable: vi.fn(), fetchTables: vi.fn() }) }));
vi.mock('@/hooks/useRealtimeGuests', () => ({ useRealtimeGuests: () => ({ guests: [], loading: false, moveGuest: vi.fn(), reorderGuestsWithSeats: vi.fn() }) }));
vi.mock('@/hooks/useRealtimeTables', () => ({ useRealtimeTables: () => ({ tables: [], getGuestsForTable: vi.fn() }) }));
vi.mock('@/hooks/useUndoStack', () => ({ useUndoStack: () => ({ pushAction: vi.fn(), undo: vi.fn(), canUndo: false, lastAction: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => ({ plan: null, isTrialExpired: false, isStarterPlan: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('@/components/SEO/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('@/components/Dashboard/StatsBar', () => ({ StatsBar: () => null }));
vi.mock('@/components/Dashboard/CreateTableModal', () => ({ CreateTableModal: () => null }));
vi.mock('@/components/Dashboard/PlanExpiredModal', () => ({ PlanExpiredModal: () => null }));
vi.mock('@/components/Dashboard/ExpiryWarningBanner', () => ({ ExpiryWarningBanner: () => null }));

import { Dashboard } from './Dashboard';

const renderDashboard = (entry: string) => {
  const router = createMemoryRouter([{ path: '/dashboard/*', element: <Dashboard /> }], { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
  return router;
};

describe('persistent Dashboard navigation shell', () => {
  beforeEach(() => {
    delayed.pending = false;
    delayed.promise = null;
    delayed.resolve = null;
    delayed.failed = false;
  });

  it('keeps sidebar DOM identity and immediate selection while destination code is slow', async () => {
    const router = renderDashboard('/dashboard?tab=qr-code');
    expect(await screen.findByText('QR content')).toBeInTheDocument();
    const sidebar = screen.getByTestId('dashboard-sidebar');

    delayed.pending = true;
    delayed.promise = new Promise<void>((resolve) => { delayed.resolve = resolve; });
    const firstStart = performance.now();
    fireEvent.click(screen.getByRole('button', { name: 'Seating Chart Signs' }));
    const firstFeedbackMs = performance.now() - firstStart;

    expect(router.state.location.search).toBe('?tab=signage');
    expect(screen.getByRole('button', { name: 'Seating Chart Signs' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('dashboard-sidebar')).toBe(sidebar);
    // Deferred navigation keeps the already rendered page visible while the
    // destination suspends, avoiding a blank/full-page loading takeover.
    expect(screen.getByText('QR content')).toBeInTheDocument();
    expect(document.querySelector('[data-dashboard-loading-screen]')).not.toBeInTheDocument();
    // The synchronous DOM assertions above are the deterministic guarantee;
    // jsdom wall-clock timing varies with the host and is reported below only
    // as diagnostic data.
    expect(Number.isFinite(firstFeedbackMs)).toBe(true);

    delayed.pending = false;
    await act(async () => { delayed.resolve?.(); await delayed.promise; });
    expect(await screen.findByText('Signage content')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-sidebar')).toBe(sidebar);

    await act(async () => { await router.navigate(-1); });
    expect(await screen.findByText('QR content')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-sidebar')).toBe(sidebar);
    expect(screen.getByRole('button', { name: 'QR Code Seating Chart' })).toHaveAttribute('aria-current', 'page');

    const repeatStart = performance.now();
    fireEvent.click(screen.getByRole('button', { name: 'Seating Chart Signs' }));
    expect(await screen.findByText('Signage content')).toBeInTheDocument();
    const repeatNavigationMs = performance.now() - repeatStart;
    expect(Number.isFinite(repeatNavigationMs)).toBe(true);
    console.info(`[navigation timing] first-feedback=${firstFeedbackMs.toFixed(2)}ms repeat-content=${repeatNavigationMs.toFixed(2)}ms`);
  });

  it('restores a photo/video deep link inside the mounted Dashboard shell', async () => {
    renderDashboard('/dashboard/photo-video-gallery/gallery-view');
    expect(await screen.findByText('Gallery view workspace')).toBeInTheDocument();
    expect(screen.getByTestId('active-tab')).toHaveTextContent('photo-video-gallery');
    expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
    expect(document.querySelector('[data-dashboard-content]')).toHaveClass(photoVideoManagementStyles.photoVideoWorkspaceMain);
  });

  it('canonicalises the legacy dashboard tab without dropping other location state', async () => {
    const router = renderDashboard('/dashboard?tab=kiosk-live-view&event=event-1&mode=display#controls');

    expect(await screen.findByText('Live Slideshow setup')).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard');
      expect(router.state.location.search).toBe('?tab=live-slideshow&event=event-1&mode=display');
      expect(router.state.location.hash).toBe('#controls');
    });
    expect(screen.getByTestId('active-tab')).toHaveTextContent('live-slideshow');
  });

  it('keeps Guest List on the dashboard-selected event and routes the no-table action to Tables', async () => {
    const router = renderDashboard('/dashboard?tab=guest-list');
    expect(await screen.findByTestId('guest-list-event')).toHaveTextContent('event-1');

    fireEvent.click(screen.getByRole('button', { name: 'Create Tables First' }));
    expect(router.state.location.search).toBe('?tab=table-list');
    expect(await screen.findByText('No tables created yet')).toBeInTheDocument();
  });

  it('keeps navigation usable around a recoverable page-content failure', async () => {
    delayed.failed = true;
    renderDashboard('/dashboard?tab=signage');
    expect(await screen.findByRole('alert')).toHaveTextContent('Signage data unavailable');
    const sidebar = screen.getByTestId('dashboard-sidebar');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'QR Code Seating Chart' }));
    expect(await screen.findByText('QR content')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-sidebar')).toBe(sidebar);
  });
});
