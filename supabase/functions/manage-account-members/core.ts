export const DEFAULT_ACCOUNT_SEATS = 3
export const VENDOR_PRO_ACCOUNT_SEATS = 10

export type TeamAction = 'list' | 'invite' | 'revoke-invitation' | 'remove-member' | 'accept'

export const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

export const isValidEmail = (value: unknown): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))

export const isTeamAction = (value: unknown): value is TeamAction =>
  value === 'list' || value === 'invite' || value === 'revoke-invitation'
  || value === 'remove-member' || value === 'accept'

export const safeRedirectOrigin = (configuredOrigin: string | undefined): string | null => {
  if (!configuredOrigin) return null
  try {
    const url = new URL(configuredOrigin)
    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

export const publicErrorMessage = (message: string | undefined): string => {
  const known = [
    'A valid email address is required',
    'The account holder already has access',
    'Only the active master account holder can invite users',
    'This person already has access or a pending invitation',
    'All account seats are currently occupied or reserved',
    'This invitation is invalid, expired, or has already been used',
    'Sign in with the email address that received this invitation',
    'A master account holder cannot join another account',
    'This user already belongs to another account',
    'Master account ownership cannot be changed',
  ]
  return known.find((entry) => message?.includes(entry)) ?? 'The team access request could not be completed'
}

export const resolveSeatLimit = (plan: { name?: unknown; max_users?: unknown } | null): number => {
  const name = typeof plan?.name === 'string' ? plan.name.trim().toLowerCase() : ''
  if (name === 'vendor pro') return VENDOR_PRO_ACCOUNT_SEATS
  if (name === 'essential' || name === 'premium' || name === 'unlimited' || name === 'ultimate') {
    return DEFAULT_ACCOUNT_SEATS
  }
  return DEFAULT_ACCOUNT_SEATS
}
