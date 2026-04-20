/**
 * Single source of truth for the upgrade flow plan summaries.
 * Keeps the left-side checkout summary in sync with the Stripe line item.
 */
import { PLAN_PRICES, VENDOR_PRO } from '@/lib/stripePrices';

export type PlanKey = 'essential' | 'premium' | 'unlimited' | 'vendor_pro';

export interface PlanDetail {
  key: PlanKey;
  name: string;
  price_aud: number;
  original_price_aud?: number;
  price_id: string;
  mode: 'payment' | 'subscription';
  recurring?: 'month';
  description: string;
  features: string[];
}

export const PLAN_DETAILS: Record<PlanKey, PlanDetail> = {
  essential: {
    key: 'essential',
    name: PLAN_PRICES.essential.name,
    price_aud: PLAN_PRICES.essential.price_aud,
    original_price_aud: PLAN_PRICES.essential.original_price_aud,
    price_id: PLAN_PRICES.essential.price_id,
    mode: 'payment',
    description: 'Up to 100 guests · One event · Full access',
    features: ['One event', 'Full platform access', 'Easy setup', 'Up to 100 guests'],
  },
  premium: {
    key: 'premium',
    name: PLAN_PRICES.premium.name,
    price_aud: PLAN_PRICES.premium.price_aud,
    original_price_aud: PLAN_PRICES.premium.original_price_aud,
    price_id: PLAN_PRICES.premium.price_id,
    mode: 'payment',
    description: 'Up to 200 guests · One event · Full access',
    features: ['One event', 'Full platform access', 'Easy setup', 'Up to 200 guests'],
  },
  unlimited: {
    key: 'unlimited',
    name: PLAN_PRICES.unlimited.name,
    price_aud: PLAN_PRICES.unlimited.price_aud,
    original_price_aud: PLAN_PRICES.unlimited.original_price_aud,
    price_id: PLAN_PRICES.unlimited.price_id,
    mode: 'payment',
    description: 'Unlimited guests · One event · Full access',
    features: ['One event', 'Full platform access', 'Easy setup', 'Unlimited guests'],
  },
  vendor_pro: {
    key: 'vendor_pro',
    name: VENDOR_PRO.name,
    price_aud: VENDOR_PRO.price_aud,
    price_id: VENDOR_PRO.price_id,
    mode: 'subscription',
    recurring: 'month',
    description: 'Unlimited events & guests · For venues, planners, DJs/MCs',
    features: [
      'Unlimited events',
      'Unlimited guests',
      'Full platform access',
      'For venues',
      'For wedding planners',
      'For DJs & MCs',
    ],
  },
};
