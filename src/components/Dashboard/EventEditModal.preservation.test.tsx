import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { EventEditModal } from './EventEditModal';

beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });

vi.mock('@/components/EventImage/EventImageEditor', () => ({ EventImageEditor: () => null }));
vi.mock('./LocationDetailsPopover', () => ({ LocationDetailsPopover: () => null }));
vi.mock('./EventNameCombobox', () => ({
  EventNameCombobox: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <input aria-label="Section name" value={value} onChange={e => onChange(e.target.value)} />,
}));
vi.mock('./TimePicker', () => ({
  TimePicker: ({ value }: { value: string }) => <input aria-label="Time" value={value} readOnly />,
}));
vi.mock('./EventDatePicker', () => ({
  EventDatePicker: ({ value }: { value: Date | null }) =>
    <input aria-label="Date" value={value?.toISOString().slice(0, 10) ?? ''} readOnly />,
}));

const event = {
  id: 'isolated-event', name: 'QA wedding', date: '2027-04-11', venue: 'Reception venue',
  venue_address: 'Reception address', venue_phone: '222', venue_contact: 'Reception contact',
  venue_contact_email: 'reception@example.test', start_time: '17:00', finish_time: '23:00',
  guest_limit: 100, created_at: '2026-08-16T00:00:00Z', event_created: null,
  expiry_date: null, created_date_local: null, expiry_date_local: null,
  event_timezone: 'Australia/Sydney', rsvp_deadline: '2027-03-10T00:00:00Z',
  ceremony_enabled: true, reception_enabled: true, ceremony_name: 'QA ceremony',
  ceremony_date: '2027-04-10', ceremony_venue: 'Ceremony venue', ceremony_guest_limit: 40,
  ceremony_venue_address: 'Ceremony address', ceremony_venue_phone: '111',
  ceremony_venue_contact: 'Ceremony contact', ceremony_venue_contact_email: 'ceremony@example.test',
  ceremony_start_time: '13:00', ceremony_finish_time: '14:00', ceremony_rsvp_deadline: '2027-03-01',
};

describe('My Events edit draft preservation', () => {
  it('preserves distinct saved reception details when opening and submitting the form', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EventEditModal isOpen event={event} onClose={vi.fn()} onSave={onSave} onImageChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("Add the name of your event - e.g., Jason & Linda's Wedding")).toHaveValue(event.name);
    expect(screen.getByPlaceholderText('e.g., Reception Venue')).toHaveValue(event.venue);
    expect(screen.getAllByRole('spinbutton')[1]).toHaveValue(100);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(event.id, expect.objectContaining({
      name: event.name, date: event.date, venue: event.venue,
      venue_address: event.venue_address, venue_phone: event.venue_phone,
      venue_contact: event.venue_contact, venue_contact_email: event.venue_contact_email,
      guest_limit: 100, rsvp_deadline: '2027-03-10T00:00:00.000Z',
      ceremony_name: event.ceremony_name, ceremony_guest_limit: 40,
    })));
  });

  it('continues syncing matching venues while keeping an existing distinct reception venue', () => {
    const props = { isOpen: true, onClose: vi.fn(), onSave: vi.fn(), onImageChange: vi.fn() };
    const { rerender } = render(<EventEditModal {...props} event={{ ...event, venue: event.ceremony_venue }} />);
    fireEvent.change(screen.getByPlaceholderText('e.g., Church/Venue'), { target: { value: 'Shared updated venue' } });
    expect(screen.getByPlaceholderText('e.g., Reception Venue')).toHaveValue('Shared updated venue');

    rerender(<EventEditModal {...props} event={{ ...event, id: 'other-isolated-event' }} />);
    fireEvent.change(screen.getByPlaceholderText('e.g., Church/Venue'), { target: { value: 'Different ceremony venue' } });
    expect(screen.getByPlaceholderText('e.g., Reception Venue')).toHaveValue(event.venue);
    expect(props.onSave).not.toHaveBeenCalled();
  });
});
