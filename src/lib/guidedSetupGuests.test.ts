import { describe, expect, it } from 'vitest';

import type { GuidedSetupAnswers } from './guidedEventSetup';
import { getGuidedSetupGuestDesignation, getGuidedSetupGuestSeeds } from './guidedSetupGuests';

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
      { firstName: 'Nader', lastName: 'Elalfy', origin: 'wedding_couple_1' },
      { firstName: 'Nahla', lastName: 'Megm', origin: 'wedding_couple_2' },
    ]);
  });

  it('uses the complete supplied birthday honouree name without inventing a surname split', () => {
    expect(getGuidedSetupGuestSeeds(answers('birthday'))).toEqual([
      { firstName: 'Jordan Taylor', lastName: null, origin: 'birthday_celebrant' },
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
});
