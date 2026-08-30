export type TablePurpose = 'standard' | 'head';

export type HeadSeatEntry =
  | { kind: 'participant'; participant: 'primary_1' | 'primary_2' }
  | { kind: 'guest'; guest_id: string };

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
      return [{ kind: 'participant', participant: candidate.participant }];
    }
    if (candidate.kind === 'guest' && typeof candidate.guest_id === 'string' && !seenGuests.has(candidate.guest_id)) {
      seenGuests.add(candidate.guest_id);
      return [{ kind: 'guest', guest_id: candidate.guest_id }];
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

