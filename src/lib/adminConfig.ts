// Admin access control configuration
// Only users listed here can access admin panel

export const ADMIN_CONFIG = {
  ADMIN_EMAILS: [
    'naderelalfy1977@gmail.com', // Bootstrap admin
  ],
  ADMIN_USER_IDS: [
    'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa', // Bootstrap admin
  ],
};

export const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  return ADMIN_CONFIG.ADMIN_EMAILS.includes(email);
};

export const isAdminUserId = (userId: string | undefined): boolean => {
  if (!userId) return false;
  return ADMIN_CONFIG.ADMIN_USER_IDS.includes(userId);
};
