import type { CurrencyCode } from './currencyPricing';
export function validateBudgetQuote(data: unknown, from: CurrencyCode, to: CurrencyCode, now = Date.now()) {
 const value = data as { base?: string; date?: string; rates?: Record<string, unknown> };
 const rate = value?.rates?.[to], date = value?.date;
 const day = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date + 'T00:00:00Z') : NaN;
 if (value?.base !== from || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0 || rate > 1000 ||
 !Number.isFinite(day) || day > now || now - day > 7 * 86400000)
   throw new Error('A recent exchange rate is unavailable. Your currency and amounts have not changed.');
 return { rate, date: date!, from, to };
}
export async function fetchBudgetExchangeQuote(from: CurrencyCode, to: CurrencyCode) {
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), 10000);
 try {
  const response = await fetch('https://api.frankfurter.dev/v1/latest?base=' + from + '&symbols=' + to, { signal: controller.signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Exchange rates are temporarily unavailable. Please try again.');
  return validateBudgetQuote(await response.json(), from, to);
 } finally { clearTimeout(timeout); }
}
