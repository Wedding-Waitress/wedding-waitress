import { supabase } from '@/integrations/supabase/client';
import type { CelebrationType, GuidedSetupAnswers } from '@/lib/guidedEventSetup';

export type GuidedSetupGuestOrigin =
  | 'wedding_couple_1'
  | 'wedding_couple_2'
  | 'engagement_couple_1'
  | 'engagement_couple_2'
  | 'birthday_celebrant';

export type GuidedSetupGuestStage = 'guests-read' | 'guests-insert';

export class GuidedSetupGuestError extends Error {
  constructor(public readonly stage: GuidedSetupGuestStage, public readonly cause: unknown) {
    super(stage === 'guests-read'
      ? 'Existing Guided Setup guests could not be checked.'
      : 'Guided Setup guests could not be created.');
    this.name = 'GuidedSetupGuestError';
  }
}

interface GuidedSetupGuestSeed {
  firstName: string;
  lastName: string | null;
  origin: GuidedSetupGuestOrigin;
  familyGroup: string | null;
}

interface GuidedSetupGuestRecord {
  id: string;
  event_id: string;
  first_name: string;
  family_group?: string | null;
  guided_setup_origin?: string | null;
}

export interface GuidedSetupGuestGroupRepair {
  guestId: string;
  origin: GuidedSetupGuestOrigin;
  familyGroup: string;
}

const trimmedOrNull = (value?: string) => value?.trim() || null;

export function getGuidedSetupGuestDesignation(origin?: string | null): string | null {
  if (origin === 'wedding_couple_1' || origin === 'wedding_couple_2') return 'Couple';
  if (origin === 'engagement_couple_1' || origin === 'engagement_couple_2') return 'Engaged Couple';
  if (origin === 'birthday_celebrant') return 'Celebrant';
  return null;
}

export function getGuidedSetupCoupleGroupName(firstName: string, secondName: string): string {
  return `${firstName.trim()} & ${secondName.trim()} Couple`;
}

export function getGuidedSetupGuestGroupRepairs(
  guests: GuidedSetupGuestRecord[],
): GuidedSetupGuestGroupRepair[] {
  const repairs: GuidedSetupGuestGroupRepair[] = [];
  const pairs: Array<[GuidedSetupGuestOrigin, GuidedSetupGuestOrigin]> = [
    ['wedding_couple_1', 'wedding_couple_2'],
    ['engagement_couple_1', 'engagement_couple_2'],
  ];

  pairs.forEach(([firstOrigin, secondOrigin]) => {
    const first = guests.find((guest) => guest.guided_setup_origin === firstOrigin);
    const second = guests.find((guest) => guest.guided_setup_origin === secondOrigin);
    if (!first || !second || first.event_id !== second.event_id) return;

    const firstGroup = first.family_group?.trim() || '';
    const secondGroup = second.family_group?.trim() || '';
    const sharedGroup = firstGroup && firstGroup === secondGroup ? firstGroup : '';
    const familyGroup = sharedGroup || getGuidedSetupCoupleGroupName(first.first_name, second.first_name);

    if (firstGroup !== familyGroup) repairs.push({ guestId: first.id, origin: firstOrigin, familyGroup });
    if (secondGroup !== familyGroup) repairs.push({ guestId: second.id, origin: secondOrigin, familyGroup });
  });

  return repairs;
}

export function normalizeGuidedSetupGuestGroups<T extends GuidedSetupGuestRecord>(guests: T[]): T[] {
  const repairMap = new Map(
    getGuidedSetupGuestGroupRepairs(guests).map((repair) => [repair.guestId, repair.familyGroup]),
  );
  if (repairMap.size === 0) return guests;
  return guests.map((guest) => {
    const familyGroup = repairMap.get(guest.id);
    return familyGroup ? { ...guest, family_group: familyGroup } : guest;
  });
}

export async function repairGuidedSetupGuestGroups(
  eventId: string,
  guests: GuidedSetupGuestRecord[],
): Promise<number> {
  const repairs = getGuidedSetupGuestGroupRepairs(guests);
  const origins: Array<[GuidedSetupGuestOrigin, GuidedSetupGuestOrigin]> = [
    ['wedding_couple_1', 'wedding_couple_2'],
    ['engagement_couple_1', 'engagement_couple_2'],
  ];

  for (const [firstOrigin, secondOrigin] of origins) {
    if (!repairs.some((repair) => repair.origin === firstOrigin || repair.origin === secondOrigin)) continue;
    const first = guests.find((guest) => guest.event_id === eventId && guest.guided_setup_origin === firstOrigin);
    const second = guests.find((guest) => guest.event_id === eventId && guest.guided_setup_origin === secondOrigin);
    if (!first || !second) continue;

    const { error } = await supabase.rpc('public_manage_guest_group', {
      _event_id: eventId,
      _new_guest_id: second.id,
      _referring_guest_id: first.id,
      _guest_type: 'couple',
    });
    if (error) throw error;
  }
  return repairs.length;
}

export function getGuidedSetupGuestSeeds(answers: GuidedSetupAnswers): GuidedSetupGuestSeed[] {
  const type: CelebrationType | undefined = answers.celebrationType;
  if (type === 'wedding' || type === 'engagement') {
    const prefix = type === 'wedding' ? 'wedding_couple' : 'engagement_couple';
    const firstName = answers.customerFirstName?.trim() || '';
    const secondName = answers.partnerFirstName?.trim() || '';
    const familyGroup = getGuidedSetupCoupleGroupName(firstName, secondName);
    return [
      {
        firstName,
        lastName: trimmedOrNull(answers.customerSurname),
        origin: `${prefix}_1` as GuidedSetupGuestOrigin,
        familyGroup,
      },
      {
        firstName: secondName,
        lastName: trimmedOrNull(answers.partnerSurname),
        origin: `${prefix}_2` as GuidedSetupGuestOrigin,
        familyGroup,
      },
    ];
  }
  if (type === 'birthday') {
    return [{
      firstName: answers.honoureeName?.trim() || '',
      lastName: null,
      origin: 'birthday_celebrant',
      familyGroup: null,
    }];
  }
  return [];
}

export async function reconcileGuidedSetupGuests(
  eventId: string,
  eventOwnerId: string,
  answers: GuidedSetupAnswers,
): Promise<void> {
  for (const seed of getGuidedSetupGuestSeeds(answers)) {
    const existing = await supabase
      .from('guests')
      .select('id, family_group')
      .eq('event_id', eventId)
      .eq('guided_setup_origin', seed.origin)
      .maybeSingle();
    if (existing.error) throw new GuidedSetupGuestError('guests-read', existing.error);
    if (existing.data) {
      if (seed.familyGroup && !existing.data.family_group?.trim()) {
        const { error } = await supabase
          .from('guests')
          .update({ family_group: seed.familyGroup })
          .eq('id', existing.data.id);
        if (error) throw new GuidedSetupGuestError('guests-insert', error);
      }
      continue;
    }

    const { error } = await supabase.from('guests').insert({
      event_id: eventId,
      user_id: eventOwnerId,
      first_name: seed.firstName,
      last_name: seed.lastName,
      guided_setup_origin: seed.origin,
      family_group: seed.familyGroup,
      assigned: false,
      table_id: null,
      table_no: null,
      seat_no: null,
      email: null,
      mobile: null,
      notes: null,
      rsvp: null,
      rsvp_date: null,
      dietary: null,
    });
    if (error && error.code !== '23505') throw new GuidedSetupGuestError('guests-insert', error);
  }
}
