import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsTable } from './EventsTable';

const viewport = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => viewport.mobile }));
vi.mock('./EventEditModal', () => ({ EventEditModal: () => null }));
vi.mock('./AdditionalEventModal', () => ({ AdditionalEventModal: () => null }));
// Exercise the table/form promise boundary without a database or a filled real event.
vi.mock('./EventCreateModal', () => ({
  EventCreateModal: ({ onCreate, onClose }: { onCreate: (data: unknown) => Promise<unknown>; onClose: () => void }) => {
    const [error, setError] = useState(false);
    return <div role="dialog" aria-label="Create test event">
      <button onClick={async () => {
        try { await onCreate({ name: 'Isolated QA event' }); onClose(); }
        catch { setError(true); }
      }}>Submit test event</button>
      {error && <p role="alert">Creation failed; your draft is still here.</p>}
    </div>;
  },
}));

const event = {
  id: 'isolated-event', name: 'Isolated QA event', date: '2027-03-20', venue: 'Test venue',
  start_time: '15:00', finish_time: '23:00', guest_limit: 100, guests_count: 0,
  created_at: '2026-08-16T00:00:00Z', event_created: null, expiry_date: null,
  created_date_local: '2026-08-16', expiry_date_local: null, event_timezone: 'Australia/Sydney',
  partner1_name: null, partner2_name: null, rsvp_deadline: null, event_id: 'EV-TEST',
};

function setup(overrides: Partial<React.ComponentProps<typeof EventsTable>> = {}) {
  const props: React.ComponentProps<typeof EventsTable> = {
    events: [event], loading: false, activeEventId: null, setActiveEventId: vi.fn(),
    createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn(),
    eventLimits: {
      loading: false, atCap: false, planKey: 'free', includedEvents: 1,
      additionalPurchased: 0, totalAllowed: 1, currentEvents: 0, remaining: 1,
      canPurchaseAdditionalEvents: false, canCreate: true, eventsError: null,
      additionalEventsError: null, guestsError: null, totalGuests: 0, refresh: vi.fn(),
    },
    ...overrides,
  };
  render(<MemoryRouter><EventsTable {...props} /></MemoryRouter>);
  return props;
}

describe('My Events controls and incomplete states', () => {
  beforeEach(() => { viewport.mobile = false; });

  it.each([false, true])('selects a countdown only once (mobile: %s)', async (mobile) => {
    viewport.mobile = mobile;
    const props = setup();
    fireEvent.click(screen.getByRole('radio'));
    await waitFor(() => expect(props.setActiveEventId).toHaveBeenCalledTimes(1));
    expect(props.setActiveEventId).toHaveBeenCalledWith(event.id);
  });

  it('delegates selection to the page without also writing the active event again', async () => {
    const onEventSelect = vi.fn();
    const props = setup({ onEventSelect });
    fireEvent.click(screen.getByRole('radio'));
    await waitFor(() => expect(onEventSelect).toHaveBeenCalledTimes(1));
    expect(onEventSelect).toHaveBeenCalledWith(event.id);
    expect(props.setActiveEventId).not.toHaveBeenCalled();
  });

  it('names the mobile countdown selector and identifies deletion accurately', async () => {
    viewport.mobile = true;
    const props = setup();
    expect(screen.getByRole('radio', { name: `Show countdown for ${event.name}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Event' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Delete Event' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(props.deleteEvent).not.toHaveBeenCalled();
    expect(props.setActiveEventId).not.toHaveBeenCalled();
  });

  it('shows guidance when the desktop event list is empty', () => {
    setup({ events: [] });
    expect(screen.getByText('No events yet. Create your first event!')).toBeInTheDocument();
  });

  it('falls back to a stored expiry timestamp, then to the creation anniversary', () => {
    setup({ events: [event, { ...event, id: 'stored-expiry', name: 'Stored expiry', expiry_date: '2028-05-10T00:00:00Z' }] });
    expect(screen.getByText('16/08/2027')).toBeInTheDocument();
    expect(screen.getByText('10/05/2028')).toBeInTheDocument();
  });

  it('keeps a failed creation open and passes the error back to the form', async () => {
    const createEvent = vi.fn().mockRejectedValue(new Error('Isolated test failure'));
    const props = setup({ createEvent });
    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit test event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Creation failed');
    expect(screen.getByRole('dialog', { name: 'Create test event' })).toBeInTheDocument();
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(props.setActiveEventId).not.toHaveBeenCalled();
  });
});
