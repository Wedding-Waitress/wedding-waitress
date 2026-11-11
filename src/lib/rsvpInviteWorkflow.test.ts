import { describe, expect, it } from 'vitest';
import {
  deliveryUnavailableReason,
  getRsvpDeliverySummary,
  guestLabel,
  sendButtonLabel,
} from './rsvpInviteWorkflow';

const nader = { id: '1', first_name: 'Nader', last_name: 'Elalfy', email: 'nader@example.com', mobile: null };
const reema = { id: '2', first_name: 'Reema', last_name: 'Elalfy', email: 'reema@example.com', mobile: '+61400000000' };

describe('RSVP invitation workflow', () => {
  it('reports contact availability and canonical per-channel credit use', () => {
    const email = getRsvpDeliverySummary([nader, reema], 'email');
    expect(email.emailRecipientCount).toBe(2);
    expect(email.smsRecipientCount).toBe(0);
    expect(email.creditsUsed).toBe(2);
    expect(email.withBoth).toEqual([reema]);

    const both = getRsvpDeliverySummary([reema], 'both');
    expect(both.emailRecipientCount).toBe(1);
    expect(both.smsRecipientCount).toBe(1);
    expect(both.creditsUsed).toBe(2);
  });

  it('disables delivery methods whose required contact details are missing', () => {
    const summary = getRsvpDeliverySummary([nader]);
    expect(summary.availability).toEqual({ email: true, sms: false, both: false });
    expect(deliveryUnavailableReason('sms', [nader])).toBe('1 guest has no mobile number.');
  });

  it('uses correct singular and plural wording', () => {
    expect(guestLabel(1)).toBe('1 guest');
    expect(guestLabel(2)).toBe('2 guests');
    expect(sendButtonLabel('email', 1)).toBe('Send Email to 1 Guest');
    expect(sendButtonLabel('both', 2)).toBe('Send Email & SMS to 2 Guests');
  });
});
