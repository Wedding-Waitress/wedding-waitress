import { describe, expect, it } from 'vitest';
import {
  RELATION_ROLE_OPTIONS,
  computeRelationDisplay,
  getAllRoleOptions,
  getRelationDisplayText,
  isLegacyGuestRelation,
} from './relationUtils';
import { normalizeRole, VALID_ROLES } from './relationValidation';

describe('relationship options and legacy Guest compatibility', () => {
  it('offers the relationship options with Guest above Vendor', () => {
    expect(RELATION_ROLE_OPTIONS.map(({ label }) => label)).toEqual([
      'Bridal Party',
      'Father',
      'Mother',
      'Brother',
      'Sister',
      'Cousin',
      'Uncle',
      'Auntie',
      'Guest',
      'Vendor',
    ]);
    expect(getAllRoleOptions(['Celebrant', 'Guest', 'guest']).map(({ label }) => label))
      .toEqual([...RELATION_ROLE_OPTIONS.map(({ label }) => label), 'Celebrant']);
  });

  it.each([
    ['guest', null],
    [null, 'Guest'],
    [null, 'Reema / Guest'],
    [null, 'Reema — Guest'],
  ])('treats a legacy Guest relation as unset (role=%s, display=%s)', (role, display) => {
    expect(isLegacyGuestRelation(role, display)).toBe(true);
    expect(getRelationDisplayText(display, role)).toBe('');
  });

  it('keeps legitimate relationship wording that merely contains the word guest', () => {
    expect(getRelationDisplayText('Special Guest')).toBe('Special Guest');
  });

  it('computes the selected Guest relationship label', () => {
    expect(computeRelationDisplay('partner_one', 'guest', 'Hossam', 'Reema')).toBe('Hossam / Guest');
  });

  it('does not accept Guest as a new imported relationship', () => {
    expect(VALID_ROLES).not.toContain('guest');
    expect(normalizeRole('Guest')).toBeNull();
    expect(normalizeRole('Friend')).toBeNull();
  });
});
