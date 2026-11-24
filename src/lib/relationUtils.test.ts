import { describe, expect, it } from 'vitest';
import {
  RELATION_ROLE_OPTIONS,
  computeRelationDisplay,
  getAllRoleOptions,
  getRelationDisplayText,
  isLegacyGuestRelation,
  getPartnerRoleOptions,
} from './relationUtils';
import { normalizeRole, VALID_ROLES } from './relationValidation';

describe('relationship options and legacy Guest compatibility', () => {
  it('offers the relationship options with Guest above Vendor', () => {
    expect(RELATION_ROLE_OPTIONS.map(({ label }) => label)).toEqual([
      'Organizer', 'Bride', 'Groom',
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

  it('puts Organizer and the applicable self role first without prefixing the selected role with a partner name',()=>{
    expect(getPartnerRoleOptions(RELATION_ROLE_OPTIONS,'partner_one').slice(0,3).map(r=>r.label)).toEqual(['Organizer','Bride','Bridal Party']);
    expect(getPartnerRoleOptions(RELATION_ROLE_OPTIONS,'partner_two').slice(0,3).map(r=>r.label)).toEqual(['Organizer','Groom','Bridal Party']);
    expect(computeRelationDisplay('partner_one','bride','Carla','Kallum')).toBe('Bride');
    expect(normalizeRole('organiser')).toBe('organizer');
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
