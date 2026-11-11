/**
 * Pricing configuration. AUD is the only active currency for new prices and
 * purchases. Historical currency definitions remain available solely so an
 * existing legacy record can be rendered truthfully without relabelling it.
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
    essential: { price: PACKAGE_PRICES_AUD.essential, price_id: 'price_1UFTfT5GzTmqOxGKWxqjYWed' },
    premium:   { price: PACKAGE_PRICES_AUD.premium, price_id: 'price_1UFTfW5GzTmqOxGKjj1dBGKR' },
    unlimited: { price: PACKAGE_PRICES_AUD.unlimited, price_id: 'price_1UFTfa5GzTmqOxGK9EDWU9t6' },
  },
  USD: {
    essential: { price: converted(PACKAGE_PRICES_AUD.essential, 'USD'), price_id: 'price_1UDdle5GzTmqOxGKuDmLmMN9' },
    premium:   { price: converted(PACKAGE_PRICES_AUD.premium, 'USD'), price_id: 'price_1UDeO85GzTmqOxGKpE4I9I3x' },
    unlimited: { price: converted(PACKAGE_PRICES_AUD.unlimited, 'USD'), price_id: 'price_1UDeO95GzTmqOxGK0VhHhcl0' },
  },
  GBP: {
    essential: { price: converted(PACKAGE_PRICES_AUD.essential, 'GBP'), price_id: 'price_1UDdle5GzTmqOxGKizBfLKQj' },
    premium:   { price: converted(PACKAGE_PRICES_AUD.premium, 'GBP'), price_id: 'price_1UDeO85GzTmqOxGKPHstNiGn' },
    unlimited: { price: converted(PACKAGE_PRICES_AUD.unlimited, 'GBP'), price_id: 'price_1UDeOA5GzTmqOxGKVTSZdYxI' },
  },
  EUR: {
    essential: { price: converted(PACKAGE_PRICES_AUD.essential, 'EUR'), price_id: 'price_1UDdlf5GzTmqOxGK2nP9Y3vP' },
    premium:   { price: converted(PACKAGE_PRICES_AUD.premium, 'EUR'), price_id: 'price_1UDeO85GzTmqOxGKjs1pGVUi' },
    unlimited: { price: converted(PACKAGE_PRICES_AUD.unlimited, 'EUR'), price_id: 'price_1UDeOA5GzTmqOxGK6Jc6RQ86' },
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
