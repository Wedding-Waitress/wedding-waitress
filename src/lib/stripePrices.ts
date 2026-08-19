/**
 * Stripe Price & Product ID mappings for Wedding Waitress.
 * Single source of truth for all Stripe references.
 */

// ── Wedding Plans (one-time payments) ──────────────────────────────
export const PLAN_PRICES = {
  essential: {
    product_id: 'prod_UOQhHcOhFdrhOs',
    price_id: 'price_1TPdpf5GzTmqOxGKTiE9x3RG',
    name: 'Essential Plan',
    price_aud: 99,
    original_price_aud: 199, // strikethrough marketing price
    guest_limit: 100,
    plan_db_id: '78cdab0d-d81d-4757-b7cc-f210b8b30f47',
  },
  premium: {
    product_id: 'prod_UOQhTWnFzXV1FK',
    price_id: 'price_1TPdq05GzTmqOxGKEPamRNNq',
    name: 'Premium Plan',
    price_aud: 149,
    original_price_aud: 299,
    guest_limit: 200,
    plan_db_id: '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8',
  },
  unlimited: {
    product_id: 'prod_UOQhLIYTxQAd7U',
    price_id: 'price_1TPdqZ5GzTmqOxGKRUn5rKbD',
    name: 'Unlimited Plan',
    price_aud: 249,
    original_price_aud: 499,
    guest_limit: null,
    plan_db_id: 'cd10f207-2109-4546-a635-0baa68ba8213',
  },
} as const;

// ── Vendor Pro (monthly subscription, AUD baseline) ────────────────
// Updated 2026-05-08: A$299/mo, 100 events included, up to 10 account users.
// Multi-currency price IDs live in `currencyPricing.ts` and `planRegistry.ts`.
export const VENDOR_PRO = {
  product_id: 'prod_UTm2XBA5rX9dGN',
  price_id: 'price_1TUoUX5GzTmqOxGK4eswrMPQ',
  name: 'Vendor Pro',
  price_aud: 299,
  included_events: 100,
  max_users: 10,
  plan_db_id: '632b476a-39da-4f6f-8457-9ba104d571da',
} as const;

// ── Additional Event SKU (one-time, per extra event) ───────────────
// Multi-currency variants live in `planRegistry.ts` (ADDITIONAL_EVENT.prices).
export const ADDITIONAL_EVENT_AUD = {
  product_id: 'prod_UTm7byFGV7E127',
  price_id: 'price_1TUoZ15GzTmqOxGKDRmvofDh',
  name: 'Additional Event',
  price_aud: 99,
} as const;

// ── RSVP Invite Bundles (one-time, per event) ──────────────────────
export const RSVP_TIERS = [
  { min: 1,   max: 100,  price_aud: 100, label: '1–100 guests',    product_id: 'prod_Tyt1bSwrpOzxNd', price_id: 'price_1TSzPs5GzTmqOxGK4Ca8kAAz' },
  { min: 101, max: 200,  price_aud: 129, label: '101–200 guests',  product_id: 'prod_Tyt1FzdN9h5IcQ', price_id: 'price_1TSzRu5GzTmqOxGK9gIwfeU4' },
  { min: 201, max: 300,  price_aud: 149, label: '201–300 guests',  product_id: 'prod_Tyt4UbA83epUQG', price_id: 'price_1TSzSJ5GzTmqOxGKaGm02LiC' },
  { min: 301, max: 400,  price_aud: 159, label: '301–400 guests',  product_id: 'prod_Tyt4pPolYzGjSf', price_id: 'price_1TSzSs5GzTmqOxGKMHCPxGfe' },
  { min: 401, max: 500,  price_aud: 199, label: '401–500 guests',  product_id: 'prod_Tyt5APL1elHibZ', price_id: 'price_1TSzTH5GzTmqOxGKJ8qK3os0' },
  { min: 501, max: 1000, price_aud: 299, label: '501–1000 guests', product_id: 'prod_Tyt6a9w3AuwyzB', price_id: 'price_1TSzTg5GzTmqOxGK5k36snjG' },
] as const;

/** Get the RSVP tier for a given guest count */
export const getRsvpTier = (guestCount: number) => {
  return RSVP_TIERS.find(t => guestCount >= t.min && guestCount <= t.max) ?? RSVP_TIERS[RSVP_TIERS.length - 1];
};

// ── Smart RSVP & Messaging — SMS Top-up (one-time, 250 credits) ────
export const SMS_TOPUP = {
  product_id: 'prod_UTh041rdR91og1',
  price_id: 'price_1TUjcr5GzTmqOxGKFoK9ZKrZ',
  name: 'Smart RSVP & Messaging — SMS Top-up (250 credits)',
  price_aud: 99,
  credits: 250,
} as const;

// ── RSVP Invite Overage (one-time, $10 AUD per 10 extra guests) ────
export const RSVP_OVERAGE = {
  product_id: 'prod_URud0pt0K8Sl9i',
  price_id: 'price_1TT0o05GzTmqOxGKUIiEXxj6',
  name: 'RSVP Invite Overage — 10 Guests',
  price_aud: 10,
  guests_per_block: 10,
} as const;

/** Map Stripe product IDs back to plan DB IDs */
export const PRODUCT_TO_PLAN: Record<string, { plan_db_id: string; name: string }> = {
  [PLAN_PRICES.essential.product_id]: { plan_db_id: PLAN_PRICES.essential.plan_db_id, name: 'Essential' },
  [PLAN_PRICES.premium.product_id]: { plan_db_id: PLAN_PRICES.premium.plan_db_id, name: 'Premium' },
  [PLAN_PRICES.unlimited.product_id]: { plan_db_id: PLAN_PRICES.unlimited.plan_db_id, name: 'Unlimited' },
  [VENDOR_PRO.product_id]: { plan_db_id: VENDOR_PRO.plan_db_id, name: 'Vendor Pro' },
};
