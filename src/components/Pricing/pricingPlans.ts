export type PlanKey = 'essential' | 'premium' | 'unlimited';

import { PACKAGE_PRICES_AUD } from '@/lib/packagePricing';
import { PACKAGE_GUEST_LIMITS } from '../../../supabase/functions/_shared/packageGuestLimits';

export const PUBLIC_COUPLE_PLAN_DETAILS = {
  essential: { name: 'Essential', guests: PACKAGE_GUEST_LIMITS.essential, communicationCredits: 150, priceAud: PACKAGE_PRICES_AUD.essential },
  premium: { name: 'Premium', guests: PACKAGE_GUEST_LIMITS.premium, communicationCredits: 250, priceAud: PACKAGE_PRICES_AUD.premium },
  unlimited: { name: 'Ultimate', guests: PACKAGE_GUEST_LIMITS.unlimited, communicationCredits: 450, priceAud: PACKAGE_PRICES_AUD.unlimited },
} as const;
