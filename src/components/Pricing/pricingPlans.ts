export type PlanKey = 'essential' | 'premium' | 'unlimited' | 'vendor_pro';

export const PUBLIC_COUPLE_PLAN_DETAILS = {
  essential: { name: 'Essential', guests: 100, priceAud: 99 },
  premium: { name: 'Premium', guests: 200, priceAud: 149 },
  unlimited: { name: 'Ultimate', guests: 500, priceAud: 249 },
} as const;
