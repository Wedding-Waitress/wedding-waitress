export const normalizeGuestName = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export function isInitialSearchAvailable(eventDate: string | null | undefined, timeZone: string, now = new Date()): boolean {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    const today = Date.parse(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
    const eventDay = Date.parse(`${eventDate}T00:00:00Z`);
    return Number.isFinite(eventDay) && today >= eventDay - 7 * 86400000;
  } catch { return false; }
}

export function matchesGuestSearch(guest: { first_name: string; last_name: string }, query: string, allowInitial: boolean): boolean {
  const input = normalizeGuestName(query);
  const first = normalizeGuestName(guest.first_name);
  const last = normalizeGuestName(guest.last_name);
  if (!first || !last) return false;
  if (!allowInitial) return input === `${first} ${last}`;
  if (!input.startsWith(`${first} `)) return false;
  const surname = input.slice(first.length + 1);
  return surname.length > 0 && last.startsWith(surname);
}
