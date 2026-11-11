// Utility functions for relationship tracking

export type RelationPartner = 'partner_one' | 'partner_two' | '';
export type RelationRole = 'bridal_party' | 'father' | 'mother' | 'brother' | 'sister' | 'cousin' | 'uncle' | 'aunty' | 'guest' | 'vendor' | '';

export const RELATION_ROLE_LABELS: Record<string, string> = {
  bridal_party: 'Bridal Party',
  father: 'Father',
  mother: 'Mother',
  brother: 'Brother',
  sister: 'Sister',
  cousin: 'Cousin',
  uncle: 'Uncle',
  aunty: 'Auntie',
  guest: 'Guest',
  vendor: 'Vendor',
};

export interface RoleOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

export const RELATION_ROLE_OPTIONS: RoleOption[] = [
  { value: 'bridal_party', label: 'Bridal Party' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunty', label: 'Auntie' },
  { value: 'guest', label: 'Guest' },
  { value: 'vendor', label: 'Vendor' },
];

export const isLegacyGuestRelation = (role?: string | null, display?: string | null): boolean => {
  if (role?.trim().toLowerCase() === 'guest') return true;
  const parts = (display || '').split(/\s*(?:\/|\u2014|â€”)\s*/);
  return parts.length <= 2 && parts.at(-1)?.trim().toLowerCase() === 'guest';
};

/** Display-only compatibility for saved legacy `Guest` relationships. */
export const getRelationDisplayText = (display?: string | null, role?: string | null): string =>
  isLegacyGuestRelation(role, display) ? '' : (display?.trim() || '');

export const getAllRoleOptions = (customRoles: string[] = []): RoleOption[] => {
  const defaultOptions = [...RELATION_ROLE_OPTIONS];
  const customOptions: RoleOption[] = customRoles
    .filter(role => role.trim().toLowerCase() !== 'guest')
    .map(role => ({
    value: `custom_${role.toLowerCase().replace(/\s+/g, '_')}`,
    label: role,
    isCustom: true
  }));
  
  return [...defaultOptions, ...customOptions];
};

export const computeRelationDisplay = (
  partner: RelationPartner,
  role: RelationRole,
  partner1Name?: string | null,
  partner2Name?: string | null,
  customRoles: string[] = []
): string => {
  if (!partner || !role) return '';
  
  // Use fallback names if partner names are empty
  const effectivePartner1Name = partner1Name?.trim() || 'Partner 1';
  const effectivePartner2Name = partner2Name?.trim() || 'Partner 2';
  
  const partnerName = partner === 'partner_one' ? effectivePartner1Name : effectivePartner2Name;
  
  // Handle custom roles
  if (role.startsWith('custom_')) {
    const customRoleName = customRoles.find(cr => 
      `custom_${cr.toLowerCase().replace(/\s+/g, '_')}` === role
    );
    if (customRoleName) {
      return `${partnerName} / ${customRoleName}`;
    }
    return '';
  }
  
  // Handle standard roles
  const roleLabel = RELATION_ROLE_LABELS[role];
  
  if (!roleLabel) return '';
  
  return `${partnerName} / ${roleLabel}`;
};
