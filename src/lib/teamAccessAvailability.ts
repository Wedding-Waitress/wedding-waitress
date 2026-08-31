/**
 * Team access remains fail-closed until the account-wide event/data policies
 * and the supporting Edge Functions have been deployed and verified together.
 * Vite only exposes an explicit `true`; missing or malformed values stay off.
 */
export const TEAM_ACCESS_ENABLED = import.meta.env.VITE_TEAM_ACCESS_ENABLED === 'true';

export const TEAM_ACCESS_UNAVAILABLE_MESSAGE =
  'Team access is not available in this environment yet. Your account and event data remain private to the account holder.';
