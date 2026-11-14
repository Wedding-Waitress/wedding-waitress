import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildEditedGuestGroupName,
  deriveSavedGuestCategory,
  validateEditedGuestCategory,
} from './editGuestCategory';

const editDrawerSource = readFileSync('src/components/Dashboard/AddGuestModal.tsx', 'utf8');

describe('Edit Guest category changes', () => {
  it('shows a one-person stale family group as Individual', () => {
    const nader = { id: 'nader', family_group: 'Elalfy Family' };
    expect(deriveSavedGuestCategory(nader, [nader])).toBe('individual');
  });

  it('allows Individual to become Couple with exactly one new member', () => {
    expect(validateEditedGuestCategory('couple', 0, 1)).toBeNull();
    expect(validateEditedGuestCategory('couple', 0, 2)).toMatch(/exactly one/i);
    expect(buildEditedGuestGroupName('couple', 'Nader', 'Elalfy', 'Nahla', 'Elalfy'))
      .toBe('Nader & Nahla Couple');
  });

  it('allows Individual to become Family with one or more new members', () => {
    expect(validateEditedGuestCategory('family', 0, 1)).toBeNull();
    expect(validateEditedGuestCategory('family', 0, 3)).toBeNull();
    expect(buildEditedGuestGroupName('family', 'Nader', 'Elalfy')).toBe('Elalfy Family');
  });

  it('returns a remaining one-person group to Individual', () => {
    const remaining = { id: 'remaining', family_group: 'Elalfy Family' };
    expect(deriveSavedGuestCategory(remaining, [remaining])).toBe('individual');
  });

  it('saves new members with the chosen group and no inherited relationship', () => {
    expect(editDrawerSource).toMatch(/family_group:\s*finalGuestData\.family_group/);
    expect(editDrawerSource).toMatch(/\.insert\(memberInserts\)\s*\.select\('id'\)/s);
    expect(editDrawerSource).toMatch(/\.\.\.buildNewPartyMemberRelationshipFields\(\)/);
  });

  it('uses one category selector and equal responsive Relationship columns', () => {
    expect(editDrawerSource.match(/aria-label="Guest Category"/g)).toHaveLength(1);
    expect(editDrawerSource).not.toContain('Guest Group Type</Label>');
    expect(editDrawerSource).toMatch(
      /Relation[\s\S]*?grid grid-cols-1 sm:grid-cols-2 gap-3[\s\S]*?ww-edit-assign-relation/,
    );
  });
});
