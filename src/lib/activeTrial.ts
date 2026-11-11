import { isTrialGuestPlan } from './guestEntitlement';

// Entitlement is authoritative: opening checkout never upgrades an account.
export function isActiveFreeTrial(plan: {plan_name: string; status: string; is_read_only: boolean; expires_at: string | null} | null | undefined, isPlatformOwner = false, now = Date.now()): boolean {
  return !!plan && !isPlatformOwner && isTrialGuestPlan(plan.plan_name)
    && ['active', 'trial'].includes(plan.status) && !plan.is_read_only
    && !!plan.expires_at && new Date(plan.expires_at).getTime() > now;
}

export function isGuestCapacityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as {message?: unknown; details?: unknown};
  return /WW_GUEST_LIMIT_REACHED|WW_EVENT_GUEST_LIMIT_EXCEEDED|(?:event )?guest limit (?:has been )?(?:reached|exceeded)/i.test(`${value.message ?? ''} ${value.details ?? ''}`);
}
