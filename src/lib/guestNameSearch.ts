export const normalizeGuestName = (value: string | null | undefined) => (value ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');

/** Calendar arithmetic avoids daylight-saving days of 23 or 25 hours. */
export function eventCalendarDayDistance(eventDate: string | null | undefined, timeZone: string, now = new Date()): number | null {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return null;
  try {
    const eventDay = Date.parse(`${eventDate}T00:00:00Z`);
    if (!Number.isFinite(eventDay) || new Date(eventDay).toISOString().slice(0, 10) !== eventDate) return null;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    const today = Date.parse(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
    return (eventDay - today) / 86400000;
  } catch { return null; }
}

export function isInitialSearchAvailable(eventDate: string | null | undefined, timeZone: string, now = new Date()): boolean {
  const distance = eventCalendarDayDistance(eventDate, timeZone, now);
  return distance !== null && distance <= 7;
}

export function matchesGuestSearch(guest: { first_name: string | null | undefined; last_name: string | null | undefined }, query: string, allowInitial: boolean): boolean {
  const input = normalizeGuestName(query);
  const first = normalizeGuestName(guest.first_name);
  const last = normalizeGuestName(guest.last_name);
  if (!first) return false;
  if (!allowInitial) return !!last && input === `${first} ${last}`;
  // Keep exact full names valid for recipient invitation prefill.
  return input.length >= 3 && (first.startsWith(input) || (!!last && input === `${first} ${last}`));
}
