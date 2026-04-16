/**
 * Multi-currency pricing configuration.
 * Fixed predefined prices per currency (NOT live conversion).
 * Each currency has its own Stripe price ID.
 */

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
  originalPrice: number;
  price_id: string;
}

export interface VendorPricing {
  price: number;
  price_id: string;
}

/** Fixed pricing per currency per plan (one-time wedding plans) */
export const PLAN_PRICING: Record<CurrencyCode, {
  essential: PlanPricing;
  premium: PlanPricing;
  unlimited: PlanPricing;
}> = {
  AUD: {
    essential: { price: 99, originalPrice: 199, price_id: 'price_1T0vD35GzTmqOxGK3k6EQZee' },
    premium:   { price: 149, originalPrice: 299, price_id: 'price_1T0vDN5GzTmqOxGKf3kyvjxs' },
    unlimited: { price: 249, originalPrice: 499, price_id: 'price_1T0vDj5GzTmqOxGKxVXhCfub' },
  },
  USD: {
    essential: { price: 74.99, originalPrice: 149.99, price_id: 'price_1TMhcx5GzTmqOxGKxMjCfQkz' },
    premium:   { price: 104.99, originalPrice: 209.99, price_id: 'price_1TMhhr5GzTmqOxGKolZGjdWK' },
    unlimited: { price: 174.99, originalPrice: 349.99, price_id: 'price_1TMhnV5GzTmqOxGKsEJGLnZs' },
  },
  GBP: {
    essential: { price: 64.99, originalPrice: 129.99, price_id: 'price_1TMheB5GzTmqOxGK2RUVqDvC' },
    premium:   { price: 89.99, originalPrice: 179.99, price_id: 'price_1TMhlz5GzTmqOxGK1t1zUOCw' },
    unlimited: { price: 149.99, originalPrice: 299.99, price_id: 'price_1TMho75GzTmqOxGKtbNat2qU' },
  },
  EUR: {
    essential: { price: 69.99, originalPrice: 139.99, price_id: 'price_1TMher5GzTmqOxGKTI0fTE07' },
    premium:   { price: 99.99, originalPrice: 199.99, price_id: 'price_1TMhmL5GzTmqOxGKAW9J3JMC' },
    unlimited: { price: 169.99, originalPrice: 339.99, price_id: 'price_1TMhoO5GzTmqOxGKVxyufvNR' },
  },
};

/** Vendor Pro monthly pricing per currency */
export const VENDOR_PRICING: Record<CurrencyCode, VendorPricing> = {
  AUD: { price: 249, price_id: 'price_1T0vEC5GzTmqOxGK9AK1MNLL' },
  USD: { price: 179.99, price_id: 'price_1TMhpW5GzTmqOxGKXIsQO8UN' },
  GBP: { price: 149.99, price_id: 'price_1TMhpx5GzTmqOxGK72DX28oD' },
  EUR: { price: 169.99, price_id: 'price_1TMhqX5GzTmqOxGKyDaRmRFo' },
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
