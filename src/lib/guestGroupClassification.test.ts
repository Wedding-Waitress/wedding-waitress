import { describe, expect, it } from 'vitest';

import { getGuestGroupTypeMap, getGuestTypeStats } from './guestGroupClassification';

describe('guest group classification', () => {
  it('classifies a two-person guided group as one couple while retaining two guests', () => {
    const guests = [
      { id: '1', family_group: 'Nader & Nahla Couple' },
      { id: '2', family_group: 'Nader & Nahla Couple' },
    ];

    expect(getGuestGroupTypeMap(guests).get('Nader & Nahla Couple')).toBe('couple');
    expect(getGuestTypeStats(guests)).toEqual({ individual: 0, couple: 1, family: 0 });
    expect(guests).toHaveLength(2);
  });

  it('keeps ungrouped people and incomplete one-person groups in Individual', () => {
    expect(getGuestTypeStats([
      { family_group: null },
      { family_group: 'Incomplete Couple' },
    ])).toEqual({ individual: 2, couple: 0, family: 0 });
  });

  it('classifies established family groups without affecting Individual or Couple', () => {
    const guests = [
      { family_group: 'Elalfy Family' },
      { family_group: 'Elalfy Family' },
      { family_group: 'Elalfy Family' },
    ];
    expect(getGuestTypeStats(guests)).toEqual({ individual: 0, couple: 0, family: 1 });
  });
});
