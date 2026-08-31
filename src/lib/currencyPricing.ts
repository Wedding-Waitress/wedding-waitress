/**
 * Multi-currency pricing configuration.
 * Fixed predefined prices per currency (NOT live conversion).
 * Each currency has its own Stripe price ID.
 */

import { PACKAGE_PRICES_AUD } from './packagePricing';

export type CurrencyCode = 'AUD' | 'USD' | 'GBP' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  AUD: { code: 'AUD', symbol: 'A$', label: 'AUD', flag: '🇦🇺' },
  USD: { code: 'USD', symbol: '$', label: 'USD', flag: '🇺🇸' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP', flag: '🇬🇧' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR', flag: '🇪🇺' },
};

export interface PlanPricing {
  price: number;
  originalPrice?: number;
  price_id: string;
}

export interface VendorPricing {
  price: number;
  price_id: string;
}

const DISPLAY_RATES: Record<CurrencyCode, number> = { AUD: 1, USD: 0.66, GBP: 0.51, EUR: 0.60 };
const converted = (amount: number, currency: CurrencyCode) =>
  currency === 'AUD' ? amount : Math.round(amount * DISPLAY_RATES[currency]);

/** Fixed pricing per currency per plan (one-time wedding plans) */
export const PLAN_PRICING: Record<CurrencyCode, {
  essential: PlanPricing;
  premium: PlanPricing;
  unlimited: PlanPricing;
}> = {
  AUD: {
    essential: { price: PACKAGE_PRICES_AUD.essential, price_id: 'price_1T0vD35GzTmqOxGK3k6EQZee' },
    premium:   { price: PACKAGE_PRICES_AUD.premium, price_id: 'price_1T0vDN5GzTmqOxGKf3kyvjxs' },
    unlimited: { price: PACKAGE_PRICES_AUD.unlimited, price_id: 'price_1T0vDj5GzTmqOxGKxVXhCfub' },
  },
  USD: {
    essential: { price: converted(PACKAGE_PRICES_AUD.essential, 'USD'), price_id: 'price_1TMhcx5GzTmqOxGKxMjCfQkz' },
    premium:   { price: converted(PACKAGE_PRICES_AUD.premium, 'USD'), price_id: 'price_1TMhhr5GzTmqOxGKolZGjdWK' },
    unlimited: { price: converted(PACKAGE_PRICES_AUD.unlimited, 'USD'), price_id: 'price_1TMhnV5GzTmqOxGKsEJGLnZs' },
  },
  GBP: {
    essential: { price: converted(PACKAGE_PRICES_AUD.essential, 'GBP'), price_id: 'price_1TMheB5GzTmqOxGK2RUVqDvC' },
    premium:   { price: converted(PACKAGE_PRICES_AUD.premium, 'GBP'), price_id: 'price_1TMhlz5GzTmqOxGK1t1zUOCw' },
    unlimited: { price: converted(PACKAGE_PRICES_AUD.unlimited, 'GBP'), price_id: 'price_1TMho75GzTmqOxGKtbNat2qU' },
  },
  EUR: {
    essential: { price: converted(PACKAGE_PRICES_AUD.essential, 'EUR'), price_id: 'price_1TMher5GzTmqOxGKTI0fTE07' },
    premium:   { price: converted(PACKAGE_PRICES_AUD.premium, 'EUR'), price_id: 'price_1TMhmL5GzTmqOxGKAW9J3JMC' },
    unlimited: { price: converted(PACKAGE_PRICES_AUD.unlimited, 'EUR'), price_id: 'price_1TMhoO5GzTmqOxGKVxyufvNR' },
  },
};

/**
 * Vendor Pro monthly pricing per currency.
 * A$300/month (100 events included, up to 10 account users).
 * Source of truth: src/lib/planRegistry.ts (PLAN_REGISTRY.vendor_pro.prices).
 */
export const VENDOR_PRICING: Record<CurrencyCode, VendorPricing> = {
  AUD: { price: PACKAGE_PRICES_AUD.vendor_pro, price_id: 'price_1TUoUX5GzTmqOxGK4eswrMPQ' },
  USD: { price: converted(PACKAGE_PRICES_AUD.vendor_pro, 'USD'), price_id: 'price_1TUoV75GzTmqOxGKLz0sDReg' },
  GBP: { price: converted(PACKAGE_PRICES_AUD.vendor_pro, 'GBP'), price_id: 'price_1TUoY15GzTmqOxGK7AUbx77Q' },
  EUR: { price: converted(PACKAGE_PRICES_AUD.vendor_pro, 'EUR'), price_id: 'price_1TUoYZ5GzTmqOxGKt03J6gOj' },
};

/** Format a price with the correct currency symbol */
export const formatPrice = (currency: CurrencyCode, amount: number): string => {
  const cfg = CURRENCIES[currency];
  // For whole numbers, don't show decimals
  if (amount % 1 === 0) {
    return `${cfg.symbol}${amount}`;
  }
  return `${cfg.symbol}${amount.toFixed(2)}`;
};

/** Auto-detect currency from browser locale/timezone */
export const detectCurrency = (): CurrencyCode => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const locale = navigator.language || '';

    // Australia
    if (tz.startsWith('Australia/') || locale.includes('AU')) return 'AUD';
    // UK
    if (tz === 'Europe/London' || locale.includes('GB') || locale.includes('en-GB')) return 'GBP';
    // Europe (EUR zone)
    if (
      tz.startsWith('Europe/') && tz !== 'Europe/London' ||
      ['de', 'fr', 'es', 'it', 'nl', 'pt', 'el'].some(l => locale.startsWith(l))
    ) return 'EUR';
    // Americas
    if (tz.startsWith('America/') || locale.includes('US') || locale.includes('en-US')) return 'USD';

    // Default
    return 'AUD';
  } catch {
    return 'AUD';
  }
};
