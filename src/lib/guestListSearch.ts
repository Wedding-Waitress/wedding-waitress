interface SearchableGuest { first_name?: string | null; last_name?: string | null; family_group?: string | null }
const normalize = (value: string | null | undefined) => (value ?? '').trim().toLocaleLowerCase('en-AU').replace(/\s+/g, ' ');
/** Private dashboard search shared by rows, counts, exports and invitation selection. */
export function matchesGuestListSearch(guest: SearchableGuest, query: string): boolean {
  const term = normalize(query);
  if (!term) return true;
  const first = normalize(guest.first_name), last = normalize(guest.last_name);
  return [first, last, `${first} ${last}`.trim(), normalize(guest.family_group)].some(value => value.includes(term));
}
