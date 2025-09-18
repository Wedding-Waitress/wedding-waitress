// Who Is field validation and normalization utilities

export const VALID_PARTNERS = ['partner_one', 'partner_two'] as const;
export const VALID_ROLES = [
  'bridal_party', 'father', 'mother', 'brother', 'sister', 
  'cousin', 'uncle', 'aunty', 'guest', 'vendor'
] as const;

// Human-friendly mappings for common entries
export const ROLE_MAPPINGS: Record<string, string> = {
  // Father variants
  'father': 'father',
  'dad': 'father',
  'daddy': 'father',
  'papa': 'father',
  'pop': 'father',
  
  // Mother variants
  'mother': 'mother',
  'mom': 'mother',
  'mum': 'mother',
  'mama': 'mother',
  'mommy': 'mother',
  'mummy': 'mother',
  
  // Bridal party variants
  'bridal_party': 'bridal_party',
  'bridalparty': 'bridal_party',
  'bridal party': 'bridal_party',
  'bride squad': 'bridal_party',
  'bridesquad': 'bridal_party',
  'bridesmaid': 'bridal_party',
  'groomsman': 'bridal_party',
  'groomsmen': 'bridal_party',
  'bridesmaids': 'bridal_party',
  'maid of honor': 'bridal_party',
  'maidofhonor': 'bridal_party',
  'best man': 'bridal_party',
  'bestman': 'bridal_party',
  
  // Uncle/Aunty variants
  'uncle': 'uncle',
  'aunty': 'aunty',
  'aunt': 'aunty',
  'auntie': 'aunty',
  
  // Family variants
  'brother': 'brother',
  'bro': 'brother',
  'sister': 'sister',
  'sis': 'sister',
  'cousin': 'cousin',
  'cuz': 'cousin',
  
  // Guest/Vendor
  'guest': 'guest',
  'friend': 'guest',
  'vendor': 'vendor',
  'service': 'vendor',
  'supplier': 'vendor'
};

export const PARTNER_MAPPINGS: Record<string, string> = {
  'partner_one': 'partner_one',
  'partner1': 'partner_one',
  'partner 1': 'partner_one',
  'partner one': 'partner_one',
  'first': 'partner_one',
  'one': 'partner_one',
  '1': 'partner_one',
  
  'partner_two': 'partner_two',
  'partner2': 'partner_two',
  'partner 2': 'partner_two',
  'partner two': 'partner_two',
  'second': 'partner_two',
  'two': 'partner_two',
  '2': 'partner_two'
};

export interface ImportError {
  rowIndex: number;
  field: string;
  value: string;
  reason: string;
}

export const validateWhoIsFields = (
  partner: string, 
  role: string, 
  rowIndex: number
): ImportError[] => {
  const errors: ImportError[] = [];
  
  // Both must be present or both must be empty
  const hasPartner = partner?.trim();
  const hasRole = role?.trim();
  
  if (hasPartner && !hasRole) {
    errors.push({
      rowIndex,
      field: 'who_is_role',
      value: role,
      reason: 'Role is required when partner is specified'
    });
  }
  
  if (hasRole && !hasPartner) {
    errors.push({
      rowIndex,
      field: 'who_is_partner',
      value: partner,
      reason: 'Partner is required when role is specified'
    });
  }
  
  // Validate partner value if present
  if (hasPartner) {
    const normalizedPartner = normalizePartner(partner);
    if (!normalizedPartner) {
      errors.push({
        rowIndex,
        field: 'who_is_partner',
        value: partner,
        reason: `Invalid partner. Must be one of: ${VALID_PARTNERS.join(', ')}`
      });
    }
  }
  
  // Validate role value if present
  if (hasRole) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      errors.push({
        rowIndex,
        field: 'who_is_role',
        value: role,
        reason: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
      });
    }
  }
  
  return errors;
};

export const normalizePartner = (partner: string): string | null => {
  if (!partner?.trim()) return null;
  
  const normalized = partner.toLowerCase().trim();
  return PARTNER_MAPPINGS[normalized] || null;
};

export const normalizeRole = (role: string): string | null => {
  if (!role?.trim()) return null;
  
  const normalized = role.toLowerCase().trim();
  return ROLE_MAPPINGS[normalized] || null;
};

export const generateErrorReport = (errors: ImportError[]): string => {
  const csvRows = [
    'Row,Field,Value,Reason',
    ...errors.map(error => [
      error.rowIndex.toString(),
      error.field,
      `"${error.value}"`,
      `"${error.reason}"`
    ].join(','))
  ];
  
  return csvRows.join('\n');
};