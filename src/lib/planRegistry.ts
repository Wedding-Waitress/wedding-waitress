/**
 * Unified Plan Registry — single source of truth for Wedding Waitress plans.
 *
 * Reads from this file:
 *  - stripePrices.ts (re-exports)
 *  - currencyPricing.ts (per-currency prices for cards & checkout)
 *  - upgradePlans.ts (UI summaries)
 *  - useEventLimits / useAccountRole hooks
 *  - AdditionalEventModal
 *
 * Update prices/limits HERE — every consumer reflects automatically.
 */
import { PLAN_PRICES } from './stripePrices';
import type { CurrencyCode } from "./currencyPricing";
import { PLAN_PRICING, VENDOR_PRICING } from "./currencyPricing";

export type PlanKey = "essential" | "premium" | "unlimited" | "vendor_pro";

export interface PlanLimits {
  guests: number | null;          // null = unlimited
  includedEvents: number;          // events bundled in base price
  additionalEventPrice: number;    // AUD price for one extra event
  maxUsers: number;                // account user seats
}

export interface PlanCurrencyPrice {
  price: number;
  originalPrice?: number;
  price_id: string;
}

export interface PlanRegistryEntry {
  key: PlanKey;
  name: string;
  product_id: string;
  plan_db_id: string;
  mode: "payment" | "subscription";
  recurring?: "month";
  limits: PlanLimits;
  prices: Record<CurrencyCode, PlanCurrencyPrice>;
}

const couplePrices = (key: "essential" | "premium" | "unlimited"): Record<CurrencyCode, PlanCurrencyPrice> => ({
  AUD: PLAN_PRICING.AUD[key],
  USD: PLAN_PRICING.USD[key],
  GBP: PLAN_PRICING.GBP[key],
  EUR: PLAN_PRICING.EUR[key],
});

// ── Wedding Plans ───────────────────────────────────────────────
export const PLAN_REGISTRY: Record<PlanKey, PlanRegistryEntry> = {
  essential: {
    key: "essential",
    name: PLAN_PRICES.essential.name,
    product_id: "ww_live_20260914_v2_essential",
    plan_db_id: "78cdab0d-d81d-4757-b7cc-f210b8b30f47",
    mode: "payment",
    limits: { guests: PLAN_PRICES.essential.guest_limit, includedEvents: 1, additionalEventPrice: 99, maxUsers: 5 },
    prices: couplePrices("essential"),
  },
  premium: {
    key: "premium",
    name: PLAN_PRICES.premium.name,
    product_id: "ww_live_20260914_v2_premium",
    plan_db_id: "1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8",
    mode: "payment",
    limits: { guests: PLAN_PRICES.premium.guest_limit, includedEvents: 1, additionalEventPrice: 99, maxUsers: 5 },
    prices: couplePrices("premium"),
  },
  unlimited: {
    key: "unlimited",
    name: PLAN_PRICES.unlimited.name,
    product_id: "ww_live_20260914_v2_unlimited",
    plan_db_id: "cd10f207-2109-4546-a635-0baa68ba8213",
    mode: "payment",
    limits: { guests: PLAN_PRICES.unlimited.guest_limit, includedEvents: 1, additionalEventPrice: 99, maxUsers: 5 },
    prices: couplePrices("unlimited"),
  },
  vendor_pro: {
    key: "vendor_pro",
    name: "Vendor Pro",
    // A$300/month, 100 events included, 5 people total.
    product_id: "prod_UTm2XBA5rX9dGN",
    plan_db_id: "632b476a-39da-4f6f-8457-9ba104d571da",
    mode: "subscription",
    recurring: "month",
    limits: { guests: null, includedEvents: 100, additionalEventPrice: 0, maxUsers: 5 },
    prices: VENDOR_PRICING,
  },
};

// ── Additional Event SKU (one-time, per extra event) ────────────
export const ADDITIONAL_EVENT = {
  product_id: "ww_live_20260914_v2_additional_event",
  name: "Additional Event",
  prices: {
    // Historical ID is a compatibility selector; the server binds a new A$90 + GST inline Price per session.
    AUD: { price: 90,    price_id: "price_1UFTqL5GzTmqOxGKgPWVdCwr" },
    USD: { price: 74.99, price_id: "price_1TUoZT5GzTmqOxGK92kQqFuO" },
    GBP: { price: 64.99, price_id: "price_1TUobn5GzTmqOxGKQSvVqcFY" },
    EUR: { price: 69.99, price_id: "price_1TUocE5GzTmqOxGK9qKIXoHT" },
  } as Record<CurrencyCode, { price: number; price_id: string }>,
} as const;

// ── Helpers ─────────────────────────────────────────────────────
export const getPlanByName = (name?: string | null): PlanRegistryEntry | null => {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const p of Object.values(PLAN_REGISTRY)) {
    if (p.name.toLowerCase() === lower || p.key === lower.replace(/\s+/g, "_")) return p;
    if (lower.includes("vendor") && p.key === "vendor_pro") return p;
    if (lower.includes("essential") && p.key === "essential") return p;
    if (lower.includes("premium") && p.key === "premium") return p;
    if ((lower.includes("unlimited") || lower.includes("ultimate")) && p.key === "unlimited") return p;
  }
  return null;
};

export const getPlanByDbId = (planDbId?: string | null): PlanRegistryEntry | null =>
  Object.values(PLAN_REGISTRY).find(p => p.plan_db_id === planDbId) ?? null;

export const PRODUCT_TO_PLAN: Record<string, { plan_db_id: string; name: string }> =
  Object.fromEntries(
    Object.values(PLAN_REGISTRY).map(p => [p.product_id, { plan_db_id: p.plan_db_id, name: p.name }]),
  );


/** The same ordered wedding tiers drive status actions and package selection. */
export function getWeddingPlanUpgrades(currentPlanName?: string | null): PlanRegistryEntry[] {
  const tiers: PlanKey[] = ['essential', 'premium', 'unlimited'];
  const current = getPlanByName(currentPlanName);
  if (current?.key === 'vendor_pro') return [];
  const rank = current ? tiers.indexOf(current.key) : -1;
  return tiers.slice(rank + 1).map(key => PLAN_REGISTRY[key]);
}
