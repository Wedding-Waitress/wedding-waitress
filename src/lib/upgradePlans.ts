/**
 * Single source of truth for the upgrade flow plan summaries.
 * Keeps the left-side checkout summary in sync with the Stripe line item.
 */
import { PLAN_PRICES } from "@/lib/stripePrices";
import { PACKAGE_PRICES_AUD } from "@/lib/packagePricing";

export type PlanKey = "essential" | "premium" | "unlimited";

export interface PlanDetail {
  key: PlanKey;
  name: string;
  price_aud: number;
  original_price_aud?: number;
  price_id: string;
  mode: "payment" | "subscription";
  recurring?: "month";
  description: string;
  features: string[];
}

export const PLAN_DETAILS: Record<PlanKey, PlanDetail> = {
  essential: {
    key: "essential",
    name: PLAN_PRICES.essential.name,
    price_aud: PACKAGE_PRICES_AUD.essential,
    price_id: PLAN_PRICES.essential.price_id,
    mode: "payment",
    description: "Up to 100 guests · 1 event included · 5 account users",
    features: [
      "1 event included",
      "Add extra events for A$99 each",
      "Up to 5 account users",
      "Up to 100 guests",
      "Full platform access",
    ],
  },
  premium: {
    key: "premium",
    name: PLAN_PRICES.premium.name,
    price_aud: PACKAGE_PRICES_AUD.premium,
    price_id: PLAN_PRICES.premium.price_id,
    mode: "payment",
    description: "Up to 200 guests · 1 event included · 5 account users",
    features: [
      "1 event included",
      "Add extra events for A$99 each",
      "Up to 5 account users",
      "Up to 200 guests",
      "Full platform access",
    ],
  },
  unlimited: {
    key: "unlimited",
    name: PLAN_PRICES.unlimited.name,
    price_aud: PACKAGE_PRICES_AUD.unlimited,
    price_id: PLAN_PRICES.unlimited.price_id,
    mode: "payment",
    description: "Up to 400 guests · 1 event included · 5 account users",
    features: [
      "1 event included",
      "Up to 5 account users",
      "Up to 400 guests",
      "Full platform access",
    ],
  },
};
