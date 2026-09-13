import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminReadOnlyEventDetails } from './AdminReadOnlyEventDetails';
const fields = ['date','venue','venue_address','venue_phone','venue_contact','venue_contact_email','start_time','finish_time','rsvp_deadline','partner1_name','partner2_name','ceremony_name','ceremony_date','ceremony_venue','ceremony_venue_address','ceremony_venue_phone','ceremony_venue_contact','ceremony_venue_contact_email','ceremony_start_time','ceremony_finish_time','ceremony_rsvp_deadline','event_timezone','event_type','relation_mode','guest_limit','ceremony_guest_limit','ceremony_enabled','reception_enabled','allow_guest_plus_ones'];
const event = { ...Object.fromEntries(fields.map(key => [key, null])), id: 'event', user_id: 'owner', name: 'Élodie & Jean-Luc', venue: 'Actual saved reception', ceremony_venue_address: 'Actual saved ceremony address', ceremony_enabled: false, reception_enabled: true, guest_limit: 0, start_time: '13:18:00', event_timezone: 'Australia/Sydney' };
describe('saved owned event details', () => {
  it('shows actual ceremony/reception settings with no edit or session hooks', () => {
    render(<AdminReadOnlyEventDetails ownerId="owner" eventId="event" savedEvent={event} guestCount={3} tableCount={1}/>);
    expect(screen.getByText('Actual saved ceremony address')).toBeInTheDocument(); expect(screen.getByText('Actual saved reception')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument(); expect(screen.getByText('Enabled')).toBeInTheDocument(); expect(screen.getByText('13:18:00')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it.each([{...event,user_id:'foreign'},{...event,id:'other'},{...event,guest_limit:-1},{...event,ceremony_enabled:undefined}])('fails closed on foreign or incomplete settings (%j)', savedEvent => {
    render(<AdminReadOnlyEventDetails ownerId="owner" eventId="event" savedEvent={savedEvent} guestCount={0} tableCount={0}/>); expect(screen.getByText(/settings have not been invented/)).toBeInTheDocument();
  });
});
