export interface AdminSummaryInput {
  customers: Array<{ id: string; auth_record_exists?: boolean; identity_state?: string }>;
  events: Array<{ id: string; effective_date: string | null; guest_count: number }>;
}

/** Compare date-only event values with the Sydney calendar, including DST. */
export function sydneyCalendarDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getAdminCustomerSummary(data: AdminSummaryInput, now = new Date()) {
  // Reconciled rows already join auth and profile records. Deduplicate by the
  // login ID and exclude profile-only records that have no matching signup.
  const signups = new Set(data.customers
    .filter(customer => customer.auth_record_exists !== false && customer.identity_state !== 'missing_auth')
    .map(customer => customer.id));
  const today = sydneyCalendarDate(now);
  return {
    signups: signups.size,
    events: data.events.length,
    awaitingDate: data.events.filter(event => !event.effective_date).length,
    upcoming: data.events.filter(event => event.effective_date && event.effective_date >= today).length,
    past: data.events.filter(event => event.effective_date && event.effective_date < today).length,
    guests: data.events.reduce((total, event) => total + event.guest_count, 0),
  };
}
