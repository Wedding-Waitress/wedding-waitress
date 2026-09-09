export type GuestGroupType = 'individual' | 'couple' | 'family';

export interface GuestWithFamilyGroup {
  family_group?: string | null;
}

export const inferGuestGroupType = (name: string, count: number): GuestGroupType => {
  if (count < 2) return 'individual';
  if (name.endsWith(' Family')) return 'family';
  if (name.includes(' & ') || name.endsWith(' Couple')) return 'couple';
  return count >= 3 ? 'family' : 'couple';
};

export const getGuestGroupTypeMap = <T extends GuestWithFamilyGroup>(
  guests: T[],
): Map<string, GuestGroupType> => {
  const counts = new Map<string, number>();
  guests.forEach((guest) => {
    const groupName = guest.family_group?.trim();
    if (groupName) counts.set(groupName, (counts.get(groupName) || 0) + 1);
  });

  const types = new Map<string, GuestGroupType>();
  counts.forEach((count, groupName) => {
    types.set(groupName, inferGuestGroupType(groupName, count));
  });
  return types;
};

export const getGuestTypeStats = <T extends GuestWithFamilyGroup>(guests: T[]) => {
  const stats = { individual: 0, couple: 0, family: 0 };
  const groupTypes = getGuestGroupTypeMap(guests);

  guests.forEach((guest) => {
    if (!guest.family_group?.trim()) stats.individual += 1;
  });
  groupTypes.forEach((type) => {
    stats[type] += 1;
  });

  return stats;
};
