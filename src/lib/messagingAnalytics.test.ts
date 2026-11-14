import { describe, expect, it } from 'vitest';
import { hasSentInvitation, invitedResponseMetrics } from './messagingAnalytics';

describe('invitation analytics', () => {
  it.each(['not_sent', 'pending', 'failed', 'blocked', '', null])('does not count %s as sent', status => {
    expect(hasSentInvitation({ rsvp_invite_status: status })).toBe(false);
  });
  it.each(['email_sent', 'mail_sent', 'sms_sent', 'both_sent', ' SMS_SENT '])('recognises %s send evidence', status => {
    expect(hasSentInvitation({ rsvp_invite_status: status })).toBe(true);
  });
  it('recognises older timestamped invitations without a status', () => {
    expect(hasSentInvitation({ rsvp_invite_sent_at: '2026-10-01T00:00:00Z' })).toBe(true);
  });
  it('excludes uninvited family replies from the invited response rate', () => {
    const rows = Array.from({ length: 13 }, (_, index) => ({ invited: index === 0, responded: index < 4 }));
    expect(invitedResponseMetrics(rows)).toEqual({ invited: 1, respondedCount: 1, responseRate: 100 });
  });
  it('does not attribute a family response to an invited guest who has not replied', () => {
    expect(invitedResponseMetrics([{ invited: true, responded: false }, { invited: false, responded: true }]))
      .toEqual({ invited: 1, respondedCount: 0, responseRate: 0 });
  });
  it('shows no invited response rate before any invitations', () => {
    expect(invitedResponseMetrics([{ invited: false, responded: true }]).responseRate).toBeNull();
  });
});
