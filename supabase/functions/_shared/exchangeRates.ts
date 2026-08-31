export type PricingCurrency = "AUD" | "USD" | "GBP" | "EUR";

export interface ExchangeRateQuote {
  rates: Record<PricingCurrency, number>;
  updatedAt: string;
  source: "Frankfurter exchange rates";
  cached: boolean;
}

const CACHE_MS = 60 * 60 * 1000;
let lastKnownGood: ExchangeRateQuote | null = null;
let cachedAt = 0;

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export async function getAudExchangeRates(forceFresh = false): Promise<ExchangeRateQuote> {
  const now = Date.now();
  if (!forceFresh && lastKnownGood && now - cachedAt < CACHE_MS) return { ...lastKnownGood, cached: true };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch("https://api.frankfurter.app/latest?from=AUD&to=USD,GBP,EUR", {
      headers: { Accept: "application/json" }, signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Exchange-rate provider returned ${response.status}`);
    const data = await response.json();
    const rates = { AUD: 1, USD: data?.rates?.USD, GBP: data?.rates?.GBP, EUR: data?.rates?.EUR };
    if (!isValidRate(rates.USD) || !isValidRate(rates.GBP) || !isValidRate(rates.EUR)) {
      throw new Error("Exchange-rate provider returned invalid rates");
    }
    lastKnownGood = {
      rates,
      updatedAt: new Date().toISOString(),
      source: "Frankfurter exchange rates",
      cached: false,
    };
    cachedAt = now;
    return lastKnownGood;
  } catch (error) {
    if (lastKnownGood) return { ...lastKnownGood, cached: true };
    throw error;
  }
}

export const isPricingCurrency = (value: unknown): value is PricingCurrency =>
  value === "AUD" || value === "USD" || value === "GBP" || value === "EUR";

export const convertedAmountCents = (baseAud: number, currency: PricingCurrency, rates: Record<PricingCurrency, number>) =>
  Math.round(baseAud * rates[currency]) * 100;
