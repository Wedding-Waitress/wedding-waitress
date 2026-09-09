import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardOverview } from './DashboardOverview';

Element.prototype.scrollIntoView = vi.fn();

vi.mock('./EventBudgetPlanner/EventBudgetPlanner', () => ({
  EventBudgetPlanner: ({ event }: { event: { id: string; name: string } }) => (
    <section aria-label="Your Event Budget" data-event-id={event.id}>Budget for {event.name}</section>
  ),
}));

const events = [
  { id: 'event-a', name: 'Alice & Sam', date: '2027-02-14' },
  { id: 'event-b', name: 'Jordan & Lee', date: '2027-05-20' },
];

const ControlledOverview = ({ initialEventId = null }: { initialEventId?: string | null }) => {
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(initialEventId);
  return (
    <DashboardOverview
      events={events}
      selectedEventId={selectedEventId}
      onEventSelect={setSelectedEventId}
      onNavigateToTab={vi.fn()}
    />
  );
};

describe('Event Budget Planner page', () => {
  it('keeps one main page title and the approved description', () => {
    render(<ControlledOverview initialEventId="event-a" />);

    expect(screen.getAllByRole('heading', { name: 'Event Budget Planner' })).toHaveLength(1);
    expect(screen.getByText('View your event at a glance and plan, track and manage your event budget.')).toBeInTheDocument();
  });

  it('renders only the compact event selector before the selected budget', () => {
    render(<ControlledOverview initialEventId="event-a" />);

    const selectorCard = screen.getByRole('combobox', { name: 'Choose Event' }).parentElement;
    expect(selectorCard).not.toBeNull();
    expect(within(selectorCard as HTMLElement).getByText("Alice & Sam")).toBeInTheDocument();
    expect(screen.queryByText('Plan and manage the event budget. When complete, continue to Tables.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to Tables' })).not.toBeInTheDocument();
    expect(screen.queryByText('Your Event at a Glance')).not.toBeInTheDocument();
    ['Event Overview', 'Tables & Seating', 'Guest List', 'Dietary Requirements', 'Needs Attention', 'Wedding Setup Progress']
      .forEach((label) => expect(screen.queryByRole('heading', { name: label })).not.toBeInTheDocument());
    expect(screen.getByLabelText('Your Event Budget')).toHaveAttribute('data-event-id', 'event-a');
  });

  it('keeps the selector disabled when there are no events and does not show a budget', () => {
    render(
      <DashboardOverview
        events={[]}
        selectedEventId={null}
        onEventSelect={vi.fn()}
        onNavigateToTab={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Choose Event' })).toBeDisabled();
    expect(screen.queryByLabelText('Your Event Budget')).not.toBeInTheDocument();
  });

  it('loads the matching budget when the selected event changes', async () => {
    render(<ControlledOverview initialEventId="event-a" />);
    expect(screen.getByText('Budget for Alice & Sam')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Choose Event' }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: 'Jordan & Lee' }));

    await waitFor(() => expect(screen.getByText('Budget for Jordan & Lee')).toBeInTheDocument());
    expect(screen.getByLabelText('Your Event Budget')).toHaveAttribute('data-event-id', 'event-b');
  });
});
