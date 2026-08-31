export type PlanKey = 'essential' | 'premium' | 'unlimited' | 'vendor_pro';

import { PACKAGE_PRICES_AUD } from '@/lib/packagePricing';

export const PUBLIC_COUPLE_PLAN_DETAILS = {
  essential: { name: 'Essential', guests: 100, priceAud: PACKAGE_PRICES_AUD.essential },
  premium: { name: 'Premium', guests: 200, priceAud: PACKAGE_PRICES_AUD.premium },
  unlimited: { name: 'Ultimate', guests: 500, priceAud: PACKAGE_PRICES_AUD.unlimited },
} as const;
