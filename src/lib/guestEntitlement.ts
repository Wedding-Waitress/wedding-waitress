export const isTrialGuestPlan = (planName?: string | null): boolean =>
  !planName || /^(free|starter)(?:\s|$)/i.test(planName.trim());

export const guestPlanDisplayName = (planName?: string | null): string => {
  if (isTrialGuestPlan(planName)) return 'Free 7-day trial';
  if (/unlimited/i.test(planName || '')) return 'Ultimate';
  return (planName || 'Current').replace(/\s+plan$/i, '').trim();
};

export const effectiveEventGuestLimit = ({
  eventGuestLimit,
  entitledGuestLimit,
  isPlatformOwner,
  isTrial = false,
}: {
  eventGuestLimit?: number | null;
  entitledGuestLimit?: number | null;
  isPlatformOwner: boolean;
  isTrial?: boolean;
}): number | null => {
  if (isPlatformOwner) return null;
  const eventLimit = eventGuestLimit && eventGuestLimit > 0 ? eventGuestLimit : null;
  if (isTrial) return Math.min(eventLimit ?? 20, entitledGuestLimit && entitledGuestLimit > 0 ? entitledGuestLimit : 20, 20);
  const entitlement = entitledGuestLimit && entitledGuestLimit > 0 ? entitledGuestLimit : null;
  if (eventLimit === null) return entitlement;
  if (entitlement === null) return eventLimit;
  return Math.min(eventLimit, entitlement);
};
