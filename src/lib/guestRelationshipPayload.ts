export interface GuestRelationshipFields {
  relation_partner: string;
  relation_role: string;
  relation_display: string;
}

export const buildPrimaryGuestRelationshipFields = (
  partner: string | undefined,
  role: string | undefined,
  display: string,
): GuestRelationshipFields => ({
  relation_partner: partner || '',
  relation_role: role || '',
  relation_display: display,
});

export const buildNewPartyMemberRelationshipFields = (): GuestRelationshipFields => ({
  relation_partner: '',
  relation_role: '',
  relation_display: '',
});
