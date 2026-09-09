import { describe, expect, it } from 'vitest';
import { getDefaultRsvpInviteRecipientIds, hasGuestResponded } from './rsvp';

describe('persisted guest response semantics', () => {
  it('requires both a submitted response date and a final attendance value', () => {
    expect(hasGuestResponded('Attending', '2026-09-08')).toBe(true);
    expect(hasGuestResponded('Not Attending', '2026-09-08')).toBe(true);
    expect(hasGuestResponded('Attending', null)).toBe(false);
    expect(hasGuestResponded('Pending', '2026-09-08')).toBe(false);
  });

  it('defaults bulk RSVP recipients to unanswered guests even without platform sends', () => {
    const guests = [
      { id: 'attending-response', rsvp: 'Attending', rsvp_date: '2026-09-08' },
      { id: 'declined-response', rsvp: 'Not Attending', rsvp_date: '2026-09-08' },
      { id: 'external-link-unanswered', rsvp: 'Pending', rsvp_date: null },
      { id: 'preassigned-attending', rsvp: 'Attending', rsvp_date: null },
    ];

    expect(getDefaultRsvpInviteRecipientIds(guests)).toEqual([
      'external-link-unanswered',
      'preassigned-attending',
    ]);
  });
});
