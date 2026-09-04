import type { CurrencyCode } from './currencyPricing';
import { PACKAGE_PRICES_AUD } from './packagePricing';

export const SUPPORTED_PRICING_CURRENCIES: CurrencyCode[] = ['AUD', 'USD', 'GBP', 'EUR'];

export const AUD_BASE_PRICES = PACKAGE_PRICES_AUD;

export type LiveCurrencyRates = Record<CurrencyCode, number>;

export const AUD_RATES: LiveCurrencyRates = { AUD: 1, USD: 1, GBP: 1, EUR: 1 };

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && SUPPORTED_PRICING_CURRENCIES.includes(value as CurrencyCode);

export const convertAudPrice = (audAmount: number, currency: CurrencyCode, rates: LiveCurrencyRates): number => {
  if (currency === 'AUD') return audAmount;
  const rate = rates[currency];
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`No valid ${currency} exchange rate is available`);
  return Math.round(audAmount * rate);
};

export const CURRENCY_PREFIX: Record<CurrencyCode, string> = { AUD: 'A$', USD: 'US$', GBP: '£', EUR: '€' };
export const CURRENCY_LOCALE: Record<CurrencyCode, string> = { AUD: 'en-AU', USD: 'en-US', GBP: 'en-GB', EUR: 'en-IE' };

export const formatLivePrice = (currency: CurrencyCode, amount: number): string => {
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(currency, '').trim();
  return `${CURRENCY_PREFIX[currency]}${formatted}`;
};

export const formatPublicPricingPrice = (currency: CurrencyCode, amount: number): string =>
  currency === 'AUD' ? formatLivePrice(currency, amount).replace(/^A\$/, 'AUD $') : formatLivePrice(currency, amount);
