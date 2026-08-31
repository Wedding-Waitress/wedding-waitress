/**
 * Single source of truth for the upgrade flow plan summaries.
 * Keeps the left-side checkout summary in sync with the Stripe line item.
 */
import { PLAN_PRICES, VENDOR_PRO } from "@/lib/stripePrices";
import { PACKAGE_PRICES_AUD } from "@/lib/packagePricing";

export type PlanKey = "essential" | "premium" | "unlimited" | "vendor_pro";

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
    description: "Up to 100 guests · 1 event included · 3 account users",
    features: [
      "1 event included",
      "Add extra events for A$99 each",
      "Up to 3 account users",
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
    description: "Up to 200 guests · 1 event included · 3 account users",
    features: [
      "1 event included",
      "Add extra events for A$99 each",
      "Up to 3 account users",
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
    description: "Unlimited guests · 1 event included · 3 account users",
    features: [
      "1 event included",
      "Up to 3 account users",
      "Unlimited guests",
      "Full platform access",
    ],
  },
  vendor_pro: {
    key: "vendor_pro",
    name: VENDOR_PRO.name,
    price_aud: PACKAGE_PRICES_AUD.vendor_pro,
    price_id: VENDOR_PRO.price_id,
    mode: "subscription",
    recurring: "month",
    description: "100 events included · Up to 10 account users · Unlimited guests",
    features: [
      "100 events included",
      "Add extra events for A$99 each",
      "Up to 10 account users",
      "Unlimited guests",
      "Team collaboration access",
      "For venues, planners, DJs & MCs",
    ],
  },
};
