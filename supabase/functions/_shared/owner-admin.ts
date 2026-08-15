export const OWNER_ADMIN_EMAIL = 'naderelalfy1977@gmail.com';

export const normalizeOwnerAdminEmail = (email: unknown): string =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

export const isOwnerAdminEmail = (email: unknown): boolean =>
  normalizeOwnerAdminEmail(email) === OWNER_ADMIN_EMAIL;
