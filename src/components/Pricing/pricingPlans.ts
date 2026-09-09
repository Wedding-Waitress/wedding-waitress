export type PlanKey = 'essential' | 'premium' | 'unlimited';

import { PACKAGE_PRICES_AUD } from '@/lib/packagePricing';

export const PUBLIC_COUPLE_PLAN_DETAILS = {
  essential: { name: 'Essential', guests: 100, communicationCredits: 150, priceAud: PACKAGE_PRICES_AUD.essential },
  premium: { name: 'Premium', guests: 200, communicationCredits: 250, priceAud: PACKAGE_PRICES_AUD.premium },
  unlimited: { name: 'Ultimate', guests: 400, communicationCredits: 450, priceAud: PACKAGE_PRICES_AUD.unlimited },
} as const;
