import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardOverview } from './DashboardOverview';

const mocks = vi.hoisted(() => ({ useDashboardOverview: vi.fn() }));

Element.prototype.scrollIntoView = vi.fn();

vi.mock('@/hooks/useDashboardOverview', () => ({
  useDashboardOverview: mocks.useDashboardOverview,
}));

vi.mock('./EventBudgetPlanner/EventBudgetPlanner', () => ({
  EventBudgetPlanner: ({ event }: { event: { name: string } }) => <section aria-label="Event Budget Planner">Budget for {event.name}</section>,
}));

const completeData = {
  totalGuests: 3,
  attendingGuests: 2,
  pendingGuests: 0,
  declinedGuests: 1,
  tableCount: 1,
  seatedAttendingGuests: 2,
  unseatedAttendingGuests: 0,
  dietaryGuests: 1,
  overCapacityTables: 0,
  qrReady: true,
};

const events = [
  { id: 'event-a', name: 'Alice & Sam', date: '2027-02-14', venue: 'Garden Room', start_time: '18:00:00', reception_enabled: true },
  { id: 'event-b', name: 'Jordan & Lee', date: '2027-05-20', venue: 'Harbour Room', reception_enabled: true },
];

const chooseEvent = async (name: string) => {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Choose Event' }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name }));
};

describe('DashboardOverview', () => {
  beforeEach(() => {
    mocks.useDashboardOverview.mockReset();
    mocks.useDashboardOverview.mockReturnValue({ data: completeData, loading: false, error: null });
  });

  it('uses the Event Budget Planner page name and descriptive subtitle', () => {
    render(<DashboardOverview events={events} onNavigateToTab={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Event Budget Planner' })).toBeInTheDocument();
    expect(screen.getByText('View your event at a glance and plan, track and manage your event budget.')).toBeInTheDocument();
  });

  it('shows a create-event empty state when the user has no events', () => {
    const onNavigate = vi.fn();
    render(<DashboardOverview events={[]} onNavigateToTab={onNavigate} />);

    expect(screen.getByRole('heading', { name: 'Create your first event' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Choose Event' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create Your First Event' }));
    expect(onNavigate).toHaveBeenCalledWith('my-events');
  });

  it('does not show zero statistics before an event is selected', () => {
    render(<DashboardOverview events={events} onNavigateToTab={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Choose an event to begin' })).toBeInTheDocument();
    expect(screen.getByText('Select an event above to see its latest guest, seating and dietary progress, plus QR code readiness.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Guest List' })).not.toBeInTheDocument();
    expect(mocks.useDashboardOverview).toHaveBeenLastCalledWith(null);
  });

  it('switches isolated Dashboard data and only shares the event when a destination is opened', async () => {
    const onNavigate = vi.fn();
    render(<DashboardOverview events={events} onNavigateToTab={onNavigate} />);

    await chooseEvent('Alice & Sam');
    await waitFor(() => expect(mocks.useDashboardOverview).toHaveBeenLastCalledWith('event-a'));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getAllByText('Alice & Sam')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'View Guest List' }));
    expect(onNavigate).toHaveBeenCalledWith('guest-list', 'event-a');

    await chooseEvent('Jordan & Lee');
    await waitFor(() => expect(mocks.useDashboardOverview).toHaveBeenLastCalledWith('event-b'));
    expect(screen.getAllByText('Jordan & Lee')).toHaveLength(2);
  });

  it('renders accurate summaries, a reassuring attention state, progress and mobile reading order', async () => {
    render(<DashboardOverview events={events} onNavigateToTab={vi.fn()} />);
    await chooseEvent('Alice & Sam');

    await screen.findByRole('heading', { name: 'Guest List' });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('guests invited')).toBeInTheDocument();
    expect(screen.getByText('Everything looks on track')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Wedding setup progress' })).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByRole('progressbar', { name: 'Confirmed guest seating progress' })).toHaveAttribute('aria-valuenow', '100');

    const eventHeading = screen.getByRole('heading', { name: 'Event Overview' });
    const grid = eventHeading.parentElement?.parentElement?.parentElement?.parentElement;
    expect(grid).not.toBeNull();
    const headings = within(grid as HTMLElement).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Event Overview', 'Guest List', 'Tables & Seating', 'Dietary Requirements', 'Needs Attention', 'Wedding Setup Progress']);
  });

  it('gives all six cards a working bottom destination for the Dashboard-selected event', async () => {
    const onNavigate = vi.fn();
    render(<DashboardOverview events={events} onNavigateToTab={onNavigate} />);
    await chooseEvent('Alice & Sam');
    await screen.findByRole('heading', { name: 'Event Overview' });

    const destinations: Array<[string, string, string]> = [
      ['Event Overview', 'View Event Details', 'my-events'],
      ['Guest List', 'View Guest List', 'guest-list'],
      ['Tables & Seating', 'View Tables', 'table-list'],
      ['Dietary Requirements', 'View Dietary Requirements', 'dietary-chart'],
      ['Needs Attention', 'View Event Details', 'my-events'],
      ['Wedding Setup Progress', 'View QR Code', 'qr-code'],
    ];
    destinations.forEach(([heading, label, tabId]) => {
      const card = screen.getByRole('heading', { name: heading }).closest('[class*="overviewCard"]');
      expect(card).not.toBeNull();
      const action = within(card as HTMLElement).getByRole('button', { name: label });
      expect(action.className).toContain('cardAction');
      expect(action.querySelector('.lucide-chevron-right')).toBeInTheDocument();
      expect(action).not.toHaveTextContent('>');
      fireEvent.click(action);
      expect(onNavigate).toHaveBeenLastCalledWith(tabId, 'event-a');
    });
  });

  it('handles missing optional event details and actionable saved-data gaps', async () => {
    mocks.useDashboardOverview.mockReturnValue({
      data: { ...completeData, pendingGuests: 2, unseatedAttendingGuests: 1, qrReady: false },
      loading: false,
      error: null,
    });
    const onNavigate = vi.fn();
    render(<DashboardOverview events={[{ id: 'event-c', name: 'New Wedding' }]} onNavigateToTab={onNavigate} />);
    await chooseEvent('New Wedding');

    await screen.findByRole('heading', { name: 'Event Overview' });

    expect(screen.getByText('Date to be confirmed')).toBeInTheDocument();
    expect(screen.getByText('Venue to be confirmed')).toBeInTheDocument();
    expect(screen.getByText('2 guests still have not responded')).toBeInTheDocument();
    expect(screen.getByText('1 confirmed guest still needs a table')).toBeInTheDocument();
    expect(screen.getByText('Add the event date and reception venue')).toBeInTheDocument();
    expect(screen.getByText('Finish setting up the event QR code')).toBeInTheDocument();

    const attentionCard = screen.getByRole('heading', { name: 'Needs Attention' }).closest('[class*="overviewCard"]');
    const warningActions = [
      within(attentionCard as HTMLElement).getByRole('button', { name: '1 confirmed guest still needs a table' }),
      within(attentionCard as HTMLElement).getByRole('button', { name: '2 guests still have not responded' }),
    ];
    warningActions.forEach((warningAction) => {
      const warningBadge = warningAction.querySelector('[class*="attentionBadge"]');
      expect(warningBadge).toBeInTheDocument();
      expect(warningBadge?.querySelector('.lucide-circle-alert')).toBeInTheDocument();
    });
    fireEvent.click(within(attentionCard as HTMLElement).getByRole('button', { name: 'View Tables' }));
    expect(onNavigate).toHaveBeenLastCalledWith('table-list', 'event-c');

    const setupCard = screen.getByRole('heading', { name: 'Wedding Setup Progress' }).closest('[class*="overviewCard"]');
    fireEvent.click(within(setupCard as HTMLElement).getByRole('button', { name: 'Continue Wedding Setup' }));
    expect(onNavigate).toHaveBeenLastCalledWith('my-events', 'event-c');
  });
});
