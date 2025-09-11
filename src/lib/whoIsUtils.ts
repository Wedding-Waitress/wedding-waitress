// Utility functions for "Who Is" relationship tracking

export type WhoIsPartner = 'partner_one' | 'partner_two' | '';
export type WhoIsRole = 'bridal_party' | 'father' | 'mother' | 'brother' | 'sister' | 'cousin' | 'uncle' | 'aunty' | 'guest' | 'vendor' | '';

export const WHO_IS_ROLE_LABELS: Record<string, string> = {
  bridal_party: 'Bridal Party',
  father: 'Father',
  mother: 'Mother',
  brother: 'Brother',
  sister: 'Sister',
  cousin: 'Cousin',
  uncle: 'Uncle',
  aunty: 'Aunty',
  guest: 'Guest',
  vendor: 'Vendor',
};

export const WHO_IS_ROLE_OPTIONS = [
  { value: 'bridal_party', label: 'Bridal Party' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunty', label: 'Aunty' },
  { value: 'guest', label: 'Guest' },
  { value: 'vendor', label: 'Vendor' },
];

export const computeWhoIsDisplay = (
  partner: WhoIsPartner,
  role: WhoIsRole,
  partner1Name?: string | null,
  partner2Name?: string | null
): string => {
  if (!partner || !role) return '';
  
  const partnerName = partner === 'partner_one' ? partner1Name : partner2Name;
  const roleLabel = WHO_IS_ROLE_LABELS[role];
  
  if (!partnerName || !roleLabel) return '';
  
  return `${partnerName} — ${roleLabel}`;
};