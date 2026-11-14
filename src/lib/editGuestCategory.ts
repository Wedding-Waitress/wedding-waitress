import { inferGuestGroupType, type GuestGroupType } from './guestGroupClassification';

export interface GuestCategoryRecord {
  id: string;
  family_group?: string | null;
}

export const deriveSavedGuestCategory = (
  guest: GuestCategoryRecord,
  eventGuests: GuestCategoryRecord[],
): GuestGroupType => {
  const groupName = guest.family_group?.trim();
  if (!groupName) return 'individual';

  const memberCount = eventGuests.filter(
    (candidate) => candidate.family_group?.trim() === groupName,
  ).length;

  return inferGuestGroupType(groupName, memberCount);
};

export const validateEditedGuestCategory = (
  category: GuestGroupType,
  existingAdditionalMembers: number,
  pendingAdditionalMembers: number,
): string | null => {
  const totalAdditionalMembers = existingAdditionalMembers + pendingAdditionalMembers;
  if (category === 'couple' && totalAdditionalMembers !== 1) {
    return 'A couple must include exactly one additional person.';
  }
  if (category === 'family' && totalAdditionalMembers < 1) {
    return 'A family must include at least one additional person.';
  }
  return null;
};

export const buildEditedGuestGroupName = (
  category: GuestGroupType,
  primaryFirstName: string,
  primaryLastName: string,
  additionalFirstName?: string,
  additionalLastName?: string,
): string | null => {
  if (category === 'individual') return null;
  if (category === 'family') return `${primaryLastName} Family`;

  const first = primaryFirstName.trim();
  const additionalFirst = additionalFirstName?.trim();
  if (first && additionalFirst) return `${first} & ${additionalFirst} Couple`;
  return `${primaryLastName} & ${additionalLastName || primaryLastName}`;
};
