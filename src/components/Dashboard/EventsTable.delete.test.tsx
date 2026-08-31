import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsTable } from './EventsTable';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useEventLimits', () => ({
  useEventLimits: () => ({ loading: false, atCap: false, includedEvents: 1, currentEvents: 0 }),
}));
vi.mock('./EventEditModal', () => ({ EventEditModal: () => null }));
vi.mock('./EventCreateModal', () => ({ EventCreateModal: () => null }));
vi.mock('./AdditionalEventModal', () => ({ AdditionalEventModal: () => null }));

const makeEvent = (id: string, name: string) => ({
  id,
  name,
  date: '2027-03-20',
  venue: 'Venue',
  start_time: '15:00',
  finish_time: '23:00',
  guest_limit: 100,
  guests_count: 0,
  created_at: '2026-08-16T00:00:00Z',
  event_created: '2026-08-16',
  expiry_date: '2027-08-16',
  created_date_local: '2026-08-16',
  expiry_date_local: '2027-08-16',
  event_timezone: 'Australia/Sydney',
  partner1_name: null,
  partner2_name: null,
  rsvp_deadline: null,
  event_id: `EV-${id}`,
});

const victim = makeEvent('victim-uuid', 'Jack & Jill');
const remaining = makeEvent('remaining-uuid', 'Andy & Cathy');

function Harness({ mutation }: { mutation: (id: string) => Promise<unknown> }) {
  const [events, setEvents] = useState([victim, remaining]);
  const [activeEventId, setActiveEventId] = useState(victim.id);
  const deleteEvent = async (id: string) => {
    await mutation(id);
    setEvents((current) => current.filter((event) => event.id !== id));
    setActiveEventId((current) => current === id ? remaining.id : current);
  };

  return (
    <EventsTable
      events={events}
      loading={false}
      activeEventId={activeEventId}
      setActiveEventId={setActiveEventId}
      createEvent={vi.fn()}
      updateEvent={vi.fn()}
      deleteEvent={deleteEvent}
      selectedEvent={events.find((event) => event.id === activeEventId) ?? null}
      eventLimits={{
        loading: false,
        atCap: false,
        planKey: 'free',
        includedEvents: 1,
        additionalPurchased: 0,
        totalAllowed: 1,
        currentEvents: events.length,
        remaining: Math.max(0, 1 - events.length),
        canPurchaseAdditionalEvents: false,
        canCreate: true,
        eventsError: null,
        additionalEventsError: null,
        guestsError: null,
        totalGuests: 0,
        refresh: vi.fn(),
      }}
    />
  );
}

const confirmVictimDeletion = async () => {
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete event' })[0]);
  fireEvent.change(await screen.findByLabelText('Confirmation'), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Delete Event' }));
};

describe('EventsTable verified deletion flow', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('removes exactly the confirmed event, updates the counter, and safely selects a remaining event', async () => {
    const mutation = vi.fn().mockResolvedValue({ id: victim.id });
    render(<MemoryRouter><Harness mutation={mutation} /></MemoryRouter>);

    await confirmVictimDeletion();

    await waitFor(() => expect(screen.queryByText('Jack & Jill')).not.toBeInTheDocument());
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(mutation).toHaveBeenCalledWith('victim-uuid');
    expect(screen.getByText('1 Event Created')).toBeInTheDocument();
    expect(screen.getByText('My Events - Andy & Cathy')).toBeInTheDocument();
  });

  it('keeps the event and dialog available after a zero-row, RLS, or database failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mutation = vi.fn().mockRejectedValue(new Error('not deleted'));
    render(<MemoryRouter><Harness mutation={mutation} /></MemoryRouter>);

    await confirmVictimDeletion();

    expect(await screen.findByRole('button', { name: 'Delete Event' })).toBeEnabled();
    expect(screen.getByText('Jack & Jill')).toBeInTheDocument();
    expect(screen.getByText('2 Events Created')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('prevents repeated deletion submissions while the request is running', async () => {
    let resolveMutation: (() => void) | undefined;
    const mutation = vi.fn(() => new Promise<void>((resolve) => { resolveMutation = resolve; }));
    render(<MemoryRouter><Harness mutation={mutation} /></MemoryRouter>);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete event' })[0]);
    fireEvent.change(await screen.findByLabelText('Confirmation'), { target: { value: 'DELETE' } });
    const deleteButton = screen.getByRole('button', { name: 'Delete Event' });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    expect(mutation).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Deleting...' })).toBeDisabled();
    resolveMutation?.();
    await waitFor(() => expect(screen.queryByText('Jack & Jill')).not.toBeInTheDocument());
  });
});
