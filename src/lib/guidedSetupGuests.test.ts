import { describe, expect, it } from 'vitest';

import type { GuidedSetupAnswers } from './guidedEventSetup';
import {
  getGuidedSetupGuestDesignation,
  getGuidedSetupGuestGroupRepairs,
  getGuidedSetupGuestSeeds,
  normalizeGuidedSetupGuestGroups,
} from './guidedSetupGuests';

const answers = (celebrationType: GuidedSetupAnswers['celebrationType']): GuidedSetupAnswers => ({
  celebrationType,
  customerFirstName: ' Nader ',
  customerSurname: ' Elalfy ',
  partnerFirstName: ' Nahla ',
  partnerSurname: ' Megm ',
  honoureeName: ' Jordan Taylor ',
});

describe('Guided Setup automatic guests', () => {
  it('uses stable origins and supplied wedding names', () => {
    expect(getGuidedSetupGuestSeeds(answers('wedding'))).toEqual([
      { firstName: 'Nader', lastName: 'Elalfy', origin: 'wedding_couple_1', familyGroup: 'Nader & Nahla Couple' },
      { firstName: 'Nahla', lastName: 'Megm', origin: 'wedding_couple_2', familyGroup: 'Nader & Nahla Couple' },
    ]);
  });

  it('uses the complete supplied birthday honouree name without inventing a surname split', () => {
    expect(getGuidedSetupGuestSeeds(answers('birthday'))).toEqual([
      { firstName: 'Jordan Taylor', lastName: null, origin: 'birthday_celebrant', familyGroup: null },
    ]);
  });

  it.each(['corporate', 'school', 'christmas', 'other'] as const)('does not add the organiser for %s', (type) => {
    expect(getGuidedSetupGuestSeeds(answers(type))).toEqual([]);
  });

  it('maps origins to the customer-facing designations', () => {
    expect(getGuidedSetupGuestDesignation('wedding_couple_1')).toBe('Couple');
    expect(getGuidedSetupGuestDesignation('engagement_couple_2')).toBe('Engaged Couple');
    expect(getGuidedSetupGuestDesignation('birthday_celebrant')).toBe('Celebrant');
    expect(getGuidedSetupGuestDesignation(null)).toBeNull();
  });

  it('repairs only mismatched guided couple records with one shared canonical group', () => {
    expect(getGuidedSetupGuestGroupRepairs([
      { id: '1', event_id: 'event-1', first_name: 'Nader', family_group: null, guided_setup_origin: 'wedding_couple_1' },
      { id: '2', event_id: 'event-1', first_name: 'Nahla', family_group: null, guided_setup_origin: 'wedding_couple_2' },
      { id: '3', event_id: 'event-1', first_name: 'Guest', family_group: null, guided_setup_origin: null },
    ])).toEqual([
      { guestId: '1', origin: 'wedding_couple_1', familyGroup: 'Nader & Nahla Couple' },
      { guestId: '2', origin: 'wedding_couple_2', familyGroup: 'Nader & Nahla Couple' },
    ]);
  });

  it('does not overwrite an already shared couple group after guest edits', () => {
    expect(getGuidedSetupGuestGroupRepairs([
      { id: '1', event_id: 'event-1', first_name: 'Updated', family_group: 'Nader & Nahla Couple', guided_setup_origin: 'wedding_couple_1' },
      { id: '2', event_id: 'event-1', first_name: 'Nahla', family_group: 'Nader & Nahla Couple', guided_setup_origin: 'wedding_couple_2' },
    ])).toEqual([]);
  });

  it('normalizes both members for every Guest List consumer while persistence catches up', () => {
    const guests = [
      { id: '1', event_id: 'event-1', first_name: 'Nader', family_group: null, guided_setup_origin: 'wedding_couple_1' },
      { id: '2', event_id: 'event-1', first_name: 'Nahla', family_group: null, guided_setup_origin: 'wedding_couple_2' },
    ];
    expect(normalizeGuidedSetupGuestGroups(guests).map((guest) => guest.family_group)).toEqual([
      'Nader & Nahla Couple',
      'Nader & Nahla Couple',
    ]);
    expect(guests.every((guest) => guest.family_group === null)).toBe(true);
  });
});
