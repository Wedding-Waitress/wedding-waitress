import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildNewPartyMemberRelationshipFields,
  buildPrimaryGuestRelationshipFields,
} from './guestRelationshipPayload';

const modalSource = readFileSync('src/components/Dashboard/AddGuestModal.tsx', 'utf8');
const modalStyles = readFileSync('src/components/Dashboard/AddGuestModal.module.css', 'utf8');

describe('guest relationship persistence', () => {
  it.each(['organizer','bride','groom'])('saves %s with actual Attending RSVP and no seating changes',role=>{
    expect(buildPrimaryGuestRelationshipFields('partner_one',role,role)).toEqual({relation_partner:'partner_one',relation_role:role,relation_display:role,rsvp:'Attending'});
  });
  it('retains the relationship selected for the primary guest', () => {
    expect(buildPrimaryGuestRelationshipFields('partner_two', 'father', 'Reema / Father')).toEqual({
      relation_partner: 'partner_two',
      relation_role: 'father',
      relation_display: 'Reema / Father',
    });
  });

  it('starts every newly created couple or family member without a relationship', () => {
    expect(buildNewPartyMemberRelationshipFields()).toEqual({
      relation_partner: '',
      relation_role: '',
      relation_display: '',
    });
    expect(modalSource).not.toMatch(/memberRelation\?\.partner\s*\|\|\s*finalGuestData\.relation_partner/);
    expect(modalSource).not.toMatch(/memberRelation\?\.role\s*\|\|\s*finalGuestData\.relation_role/);
  });

  it('scopes an edited relationship update to the selected guest only', () => {
    expect(modalSource).toMatch(
      /\.from\('guests'\)\s*\.update\(finalGuestData\)\s*\.eq\('id', editGuest\.id\)/s,
    );
    expect(modalSource).not.toMatch(
      /\.update\([^)]*relation_(?:partner|role|display)[^)]*\)\s*\.eq\('family_group'/s,
    );
  });

  it('keeps the zero-member border brown and doubles it in Wedding Waitress green when active', () => {
    expect(modalStyles).toMatch(/\.memberCountBadge\s*{[^}]*border:\s*1px solid #472c1d !important;/s);
    expect(modalStyles).toMatch(
      /\.memberCountBadge\[data-has-members="true"\]\s*{[^}]*border-color:\s*#55a447 !important;[^}]*border-width:\s*2px !important;/s,
    );
  });
});
