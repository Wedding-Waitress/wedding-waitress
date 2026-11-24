export interface GuestRelationshipFields {
  relation_partner: string;
  relation_role: string;
  relation_display: string;
  rsvp?: 'Attending';
}

export const buildPrimaryGuestRelationshipFields = (
  partner: string | undefined,
  role: string | undefined,
  display: string,
): GuestRelationshipFields => ({
  relation_partner: partner || '',
  relation_role: role || '',
  relation_display: display,
  ...(['organizer', 'bride', 'groom'].includes(role || '') ? { rsvp: 'Attending' as const } : {}),
});

export const buildNewPartyMemberRelationshipFields = (): GuestRelationshipFields => ({
  relation_partner: '',
  relation_role: '',
  relation_display: '',
});
