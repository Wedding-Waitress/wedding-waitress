export const PLAN_COMMUNICATION_CREDITS = {
  essential: 150,
  premium: 250,
  unlimited: 450,
} as const;

export const COMMUNICATION_TOPUP_PACKS = {
  credits_10: { name: 'Email & SMS Credits Top-up', price_aud: 10, credits: 10 },
  credits_100: { name: 'Email & SMS Credits Top-up', price_aud: 49, credits: 100 },
} as const;

/** Compatibility alias for the original 100-credit pack. */
export const COMMUNICATION_TOPUP = COMMUNICATION_TOPUP_PACKS.credits_100;

export const getPlanCommunicationCredits = (planName?: string | null): number => {
  const normalized = (planName || '').trim().toLowerCase();
  if (normalized === 'essential') return PLAN_COMMUNICATION_CREDITS.essential;
  if (normalized === 'premium') return PLAN_COMMUNICATION_CREDITS.premium;
  if (normalized === 'ultimate' || normalized === 'unlimited') return PLAN_COMMUNICATION_CREDITS.unlimited;
  return 0;
};
