export type TablePurpose = 'standard' | 'head';

export type HeadSeatEntry =
  | { kind: 'participant'; participant: 'primary_1' | 'primary_2'; seat_no?: number }
  | { kind: 'guest'; guest_id: string; seat_no?: number };

export const parseHeadSeatingOrder = (value: unknown): HeadSeatEntry[] => {
  if (!Array.isArray(value)) return [];
  const seenGuests = new Set<string>();
  const seenParticipants = new Set<string>();
  return value.flatMap((entry): HeadSeatEntry[] => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Record<string, unknown>;
    if (
      candidate.kind === 'participant' &&
      (candidate.participant === 'primary_1' || candidate.participant === 'primary_2') &&
      !seenParticipants.has(candidate.participant)
    ) {
      seenParticipants.add(candidate.participant);
      return [{ kind: 'participant', participant: candidate.participant, ...(Number.isInteger(candidate.seat_no) && Number(candidate.seat_no) > 0 ? { seat_no: Number(candidate.seat_no) } : {}) }];
    }
    if (candidate.kind === 'guest' && typeof candidate.guest_id === 'string' && !seenGuests.has(candidate.guest_id)) {
      seenGuests.add(candidate.guest_id);
      return [{ kind: 'guest', guest_id: candidate.guest_id, ...(Number.isInteger(candidate.seat_no) && Number(candidate.seat_no) > 0 ? { seat_no: Number(candidate.seat_no) } : {}) }];
    }
    return [];
  });
};

export const defaultHeadSeatingOrder = (participant1?: string | null, participant2?: string | null): HeadSeatEntry[] => {
  const entries: HeadSeatEntry[] = [];
  if (participant1?.trim()) entries.push({ kind: 'participant', participant: 'primary_1' });
  if (participant2?.trim()) entries.push({ kind: 'participant', participant: 'primary_2' });
  return entries;
};

export const getHeadParticipantName = (
  entry: Extract<HeadSeatEntry, { kind: 'participant' }>,
  participant1?: string | null,
  participant2?: string | null,
): string => entry.participant === 'primary_1' ? participant1?.trim() || 'Primary participant' : participant2?.trim() || 'Primary participant';

export const headTableMinimumWidthM = (capacity: number): number => Math.max(2.2, 0.72 * Math.max(1, capacity) + 0.8);


export interface HeadParticipantGuest {
  id: string;
  event_id: string;
  user_id?: string;
  first_name: string;
  last_name?: string | null;
  guided_setup_origin?: string | null;
  table_id?: string | null;
  seat_no?: number | null;
  assigned?: boolean;
}

export interface HeadParticipantTable {
  id: string;
  event_id: string;
  user_id?: string;
  table_purpose?: string;
  limit_seats: number;
  head_seating_order: unknown;
  primary_guest_ids?: Partial<Record<'primary_1' | 'primary_2', string>>;
}

const normalizedParticipantName = (name?: string | null) => name?.trim().replace(/\s+/g, ' ').toLowerCase() || '';

/** Stable setup origins win over names, including when a relative has the same name. */
export function resolveHeadParticipantGuests(
  table: Pick<HeadParticipantTable, 'event_id' | 'user_id' | 'primary_guest_ids'>,
  guests: HeadParticipantGuest[],
  participant1?: string | null,
  participant2?: string | null,
): Partial<Record<'primary_1' | 'primary_2', HeadParticipantGuest>> {
  const scoped = guests.filter(guest => guest.event_id === table.event_id && (!table.user_id || guest.user_id === table.user_id));
  const result: Partial<Record<'primary_1' | 'primary_2', HeadParticipantGuest>> = {};
  (['primary_1', 'primary_2'] as const).forEach((key, index) => {
    const explicitId = table.primary_guest_ids?.[key];
    if (explicitId) {
      const guest = scoped.find(person => person.id === explicitId);
      if (guest) result[key] = guest;
      return;
    }
    const origins = scoped.filter(guest => ['wedding_couple_' + (index + 1), 'engagement_couple_' + (index + 1)].includes(guest.guided_setup_origin || ''));
    const name = normalizedParticipantName(index === 0 ? participant1 : participant2);
    const matches = origins.length ? origins : scoped.filter(guest => !guest.guided_setup_origin && name && normalizedParticipantName([guest.first_name, guest.last_name].filter(Boolean).join(' ')) === name);
    if (matches.length === 1) result[key] = matches[0];
  });
  if (result.primary_1?.id === result.primary_2?.id) return {};
  return result;
}

/** Convert existing reservations only. Never add a removed host or move an existing seat. */
export function getHeadParticipantReconciliationOrder(
  table: HeadParticipantTable,
  guests: HeadParticipantGuest[],
  participant1?: string | null,
  participant2?: string | null,
): HeadSeatEntry[] | null {
  if (table.table_purpose !== 'head' || !table.id || !table.event_id) return null;
  const order = parseHeadSeatingOrder(table.head_seating_order);
  if (order.length > table.limit_seats || order.length !== (table.head_seating_order as unknown[])?.length) return null;
  const participants = resolveHeadParticipantGuests(table, guests, participant1, participant2);
  // Refuse an order that already represents a participant both ways.
  if (order.some(entry => entry.kind === 'participant' && participants[entry.participant] && order.some(item => item.kind === 'guest' && item.guest_id === participants[entry.participant]!.id))) return null;
  let changed = false;
  const next = order.map((entry): HeadSeatEntry => {
    if (entry.kind !== 'participant') return entry;
    const guest = participants[entry.participant];
    if (!guest || (guest.table_id != null && guest.table_id !== table.id)) return entry;
    changed = true;
    return { kind: 'guest', guest_id: guest.id };
  });
  if (!changed) return null;
  const offset = Math.floor((table.limit_seats - next.length) / 2);
  // Automatic linking must not recenter deliberately saved sparse positions.
  if (order.some((entry, index) => entry.seat_no != null && entry.seat_no !== offset + index + 1)) return null;
  const ids = next.flatMap(entry => entry.kind === 'guest' ? [entry.guest_id] : []);
  if (new Set(ids).size !== ids.length) return null;
  const scoped = guests.filter(guest => guest.event_id === table.event_id && (!table.user_id || guest.user_id === table.user_id));
  // The RPC clears omitted occupants. Refuse the repair if anyone would be removed or renumbered.
  if (scoped.some(guest => guest.table_id === table.id && (!ids.includes(guest.id) || (guest.seat_no != null && guest.seat_no !== offset + next.findIndex(entry => entry.kind === 'guest' && entry.guest_id === guest.id) + 1)))) return null;
  if (ids.some(id => !scoped.some(guest => guest.id === id && (guest.table_id == null || guest.table_id === table.id)))) return null;
  return next;
}

export const getDefaultHeadTableName = (celebrationType?: string | null) => celebrationType === "wedding" ? "Bridal Table" : "Head Table";
export function getHeadTableDisplayName(table: {name: string; table_purpose?: string}, celebrationType?: string | null): string {
  if (table.table_purpose !== "head") return table.name;
  return /^(?:head table|bridal table)?$/i.test(table.name.trim()) ? getDefaultHeadTableName(celebrationType) : table.name;
}
export function getEventCelebrationType(event?: {setup_details?: unknown} | null): string | undefined {
 const details = event?.setup_details;
 return details && typeof details === "object" && "celebrationType" in details && typeof details.celebrationType === "string" ? details.celebrationType : undefined;
}

export function getPrimaryGuestIds(event?: {setup_details?: unknown} | null): Partial<Record<'primary_1' | 'primary_2', string>> {
 const details = event?.setup_details as { primaryGuestIds?: Record<string, unknown> } | undefined;
 const source = details?.primaryGuestIds;
 if (!source || typeof source !== 'object') return {};
 const result: Partial<Record<'primary_1' | 'primary_2', string>> = {};
 for (const key of ['primary_1', 'primary_2'] as const) if (typeof source[key] === 'string' && source[key]) result[key] = source[key] as string;
 return result;
}
