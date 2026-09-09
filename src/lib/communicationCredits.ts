export const PLAN_COMMUNICATION_CREDITS = {
  essential: 150,
  premium: 250,
  unlimited: 450,
} as const;

export const COMMUNICATION_TOPUP = {
  name: 'Email & SMS Credits Top-up',
  price_aud: 49,
  credits: 100,
} as const;

export const getPlanCommunicationCredits = (planName?: string | null): number => {
  const normalized = (planName || '').trim().toLowerCase();
  if (normalized === 'essential') return PLAN_COMMUNICATION_CREDITS.essential;
  if (normalized === 'premium') return PLAN_COMMUNICATION_CREDITS.premium;
  if (normalized === 'ultimate' || normalized === 'unlimited') return PLAN_COMMUNICATION_CREDITS.unlimited;
  return 0;
};
