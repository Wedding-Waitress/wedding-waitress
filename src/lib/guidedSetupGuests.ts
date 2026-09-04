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
}

const trimmedOrNull = (value?: string) => value?.trim() || null;

export function getGuidedSetupGuestDesignation(origin?: string | null): string | null {
  if (origin === 'wedding_couple_1' || origin === 'wedding_couple_2') return 'Couple';
  if (origin === 'engagement_couple_1' || origin === 'engagement_couple_2') return 'Engaged Couple';
  if (origin === 'birthday_celebrant') return 'Celebrant';
  return null;
}

export function getGuidedSetupGuestSeeds(answers: GuidedSetupAnswers): GuidedSetupGuestSeed[] {
  const type: CelebrationType | undefined = answers.celebrationType;
  if (type === 'wedding' || type === 'engagement') {
    const prefix = type === 'wedding' ? 'wedding_couple' : 'engagement_couple';
    return [
      {
        firstName: answers.customerFirstName?.trim() || '',
        lastName: trimmedOrNull(answers.customerSurname),
        origin: `${prefix}_1` as GuidedSetupGuestOrigin,
      },
      {
        firstName: answers.partnerFirstName?.trim() || '',
        lastName: trimmedOrNull(answers.partnerSurname),
        origin: `${prefix}_2` as GuidedSetupGuestOrigin,
      },
    ];
  }
  if (type === 'birthday') {
    return [{
      firstName: answers.honoureeName?.trim() || '',
      lastName: null,
      origin: 'birthday_celebrant',
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
      .select('id')
      .eq('event_id', eventId)
      .eq('guided_setup_origin', seed.origin)
      .maybeSingle();
    if (existing.error) throw new GuidedSetupGuestError('guests-read', existing.error);
    if (existing.data) continue;

    const { error } = await supabase.from('guests').insert({
      event_id: eventId,
      user_id: eventOwnerId,
      first_name: seed.firstName,
      last_name: seed.lastName,
      guided_setup_origin: seed.origin,
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
