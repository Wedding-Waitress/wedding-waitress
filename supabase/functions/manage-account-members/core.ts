export const DEFAULT_ACCOUNT_SEATS = 5

export type TeamAction = 'list' | 'invite' | 'revoke-invitation' | 'remove-member' | 'preview' | 'accept'

export const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

export const isValidEmail = (value: unknown): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))

export const normalizePersonName = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

export const isValidPersonName = (value: unknown): boolean => {
  const name = normalizePersonName(value)
  return name.length >= 1 && name.length <= 80
}

export const normalizeMobile = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

export const isValidMobile = (value: unknown): boolean => {
  const mobile = normalizeMobile(value)
  const digits = mobile.replace(/\D/g, '')
  return mobile.length <= 30 && digits.length >= 7 && digits.length <= 15 && /^[+()\d.\s-]+$/.test(mobile)
}

export const isTeamAction = (value: unknown): value is TeamAction =>
  value === 'list' || value === 'invite' || value === 'revoke-invitation'
  || value === 'remove-member' || value === 'preview' || value === 'accept'

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
    'First name is required',
    'Last name is required',
    'A valid mobile number is required',
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
  void plan
  return DEFAULT_ACCOUNT_SEATS
}
