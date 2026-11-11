import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { EventEditModal } from './EventEditModal';

beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });
});

vi.mock('@/components/EventImage/EventImageEditor', () => ({ EventImageEditor: () => null }));
vi.mock('./LocationDetailsPopover', () => ({ LocationDetailsPopover: () => null }));
vi.mock('./EventNameCombobox', () => ({
  EventNameCombobox: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <input aria-label="Section name" value={value} onChange={e => onChange(e.target.value)} />,
}));
vi.mock('./TimePicker', () => ({
  TimePicker: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <input aria-label="Time" value={value} onChange={event => onChange(event.target.value)} />,
}));
vi.mock('./EventDatePicker', () => ({
  EventDatePicker: ({ value }: { value: Date | null }) =>
    <input aria-label="Date" value={value?.toISOString().slice(0, 10) ?? ''} readOnly />,
}));

const event = {
  id: 'isolated-event', name: 'QA wedding', date: '2027-04-11', venue: 'Reception venue',
  venue_address: 'Reception address', venue_phone: '222', venue_contact: 'Reception contact',
  venue_contact_email: 'reception@example.test', start_time: '18:00:00', finish_time: '23:00:00',
  guest_limit: 100, created_at: '2026-08-16T00:00:00Z', event_created: null,
  expiry_date: null, created_date_local: null, expiry_date_local: null,
  event_timezone: 'Australia/Sydney', rsvp_deadline: '2027-03-10T00:00:00Z',
  ceremony_enabled: true, reception_enabled: true, ceremony_name: 'QA ceremony',
  ceremony_date: '2027-04-10', ceremony_venue: 'Ceremony venue', ceremony_guest_limit: 40,
  ceremony_venue_address: 'Ceremony address', ceremony_venue_phone: '111',
  ceremony_venue_contact: 'Ceremony contact', ceremony_venue_contact_email: 'ceremony@example.test',
  ceremony_start_time: '13:00:00', ceremony_finish_time: '14:00', ceremony_rsvp_deadline: '2027-03-01',
};

describe('My Events edit draft preservation', () => {
  it.each([1440, 768, 390])('shows immediate, non-success saving feedback at a %ipx viewport', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
    window.dispatchEvent(new Event('resize'));
    let finishSave: (() => void) | undefined;
    const onSave = vi.fn(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    render(<EventEditModal isOpen event={event} onClose={vi.fn()} onSave={onSave} onImageChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    const savingButton = screen.getByRole('button', { name: 'Saving...' });
    expect(savingButton).toBeDisabled();
    expect(savingButton).toHaveAttribute('aria-busy', 'true');
    expect(onSave).toHaveBeenCalledTimes(1);

    finishSave?.();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Saving...' })).not.toBeInTheDocument());
  });

  it('preserves distinct saved reception details when opening and submitting the form', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EventEditModal isOpen event={event} onClose={vi.fn()} onSave={onSave} onImageChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("Add the name of your event - e.g., Jason & Linda's Wedding")).toHaveValue(event.name);
    expect(screen.getByPlaceholderText('e.g., Reception Venue')).toHaveValue(event.venue);
    expect(screen.getAllByRole('spinbutton')[1]).toHaveValue(100);
    expect(screen.getAllByLabelText('Time').map(input => (input as HTMLInputElement).value)).toEqual([
      '13:00', '14:00', '18:00', '23:00',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(event.id, expect.objectContaining({
      name: event.name, date: event.date, venue: event.venue,
      venue_address: event.venue_address, venue_phone: event.venue_phone,
      venue_contact: event.venue_contact, venue_contact_email: event.venue_contact_email,
      guest_limit: 100, rsvp_deadline: '2027-03-10T00:00:00.000Z',
      ceremony_name: event.ceremony_name, ceremony_guest_limit: 40,
      ceremony_start_time: '13:00', ceremony_finish_time: '14:00',
      start_time: '18:00', finish_time: '23:00',
    })));
  });

  it('saves changed reception and ceremony times and restores them when the event is reopened', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const props = { isOpen: true, onClose: vi.fn(), onSave, onImageChange: vi.fn() };
    const { rerender } = render(<EventEditModal {...props} event={event} />);
    const timeFields = screen.getAllByLabelText('Time');

    fireEvent.change(timeFields[0], { target: { value: '13:30' } });
    fireEvent.change(timeFields[3], { target: { value: '22:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(event.id, expect.objectContaining({
      ceremony_start_time: '13:30',
      finish_time: '22:30',
    })));

    rerender(<EventEditModal {...props} event={{
      ...event,
      ceremony_start_time: '13:30:00',
      finish_time: '22:30:00',
    }} />);
    expect(screen.getAllByLabelText('Time').map(input => (input as HTMLInputElement).value)).toEqual([
      '13:30', '14:00', '18:00', '22:30',
    ]);
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
