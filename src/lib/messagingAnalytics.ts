/** Persisted send evidence, excluding pending/failed/not-sent invitations. */
export function hasSentInvitation(guest: {
  rsvp_invite_status?: string | null;
  rsvp_invite_sent_at?: string | null;
}): boolean {
  return Boolean(guest.rsvp_invite_sent_at) ||
    ['email_sent', 'mail_sent', 'sms_sent', 'both_sent'].includes(
      (guest.rsvp_invite_status ?? '').trim().toLowerCase(),
    );
}

/** The numerator must use the same invited cohort as the denominator. */
export function invitedResponseMetrics<T extends { invited: boolean; responded: boolean }>(rows: T[]) {
  const invited = rows.filter(row => row.invited);
  const respondedCount = invited.filter(row => row.responded).length;
  return {
    invited: invited.length,
    respondedCount,
    responseRate: invited.length ? Math.round(respondedCount / invited.length * 100) : null,
  };
}
