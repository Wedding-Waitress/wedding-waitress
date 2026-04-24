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

// ── Vendor Pro (monthly subscription) ──────────────────────────────
export const VENDOR_PRO = {
  product_id: 'prod_UOQiLXxbgeXKZu',
  price_id: 'price_1TPdqw5GzTmqOxGKLqFbLHHe',
  name: 'Vendor Pro',
  price_aud: 249,
  plan_db_id: '632b476a-39da-4f6f-8457-9ba104d571da',
} as const;

// ── RSVP Invite Bundles (one-time, per event) ──────────────────────
export const RSVP_TIERS = [
  { min: 1,   max: 100,  price_aud: 99,  label: '1–100 guests',    product_id: 'prod_Tyt1bSwrpOzxNd', price_id: 'price_1T0vEy5GzTmqOxGKhjgWfEnK' },
  { min: 101, max: 200,  price_aud: 129, label: '101–200 guests',  product_id: 'prod_Tyt1FzdN9h5IcQ', price_id: 'price_1T0vFM5GzTmqOxGKq7KuXHHZ' },
  { min: 201, max: 300,  price_aud: 149, label: '201–300 guests',  product_id: 'prod_Tyt4UbA83epUQG', price_id: 'price_1T0vHx5GzTmqOxGKINiYdoWR' },
  { min: 301, max: 400,  price_aud: 159, label: '301–400 guests',  product_id: 'prod_Tyt4pPolYzGjSf', price_id: 'price_1T0vIX5GzTmqOxGKSLPSLsqn' },
  { min: 401, max: 500,  price_aud: 199, label: '401–500 guests',  product_id: 'prod_Tyt5APL1elHibZ', price_id: 'price_1T0vIr5GzTmqOxGK3XI7JGzK' },
  { min: 501, max: 1000, price_aud: 299, label: '501–1000 guests', product_id: 'prod_Tyt6a9w3AuwyzB', price_id: 'price_1T0vJq5GzTmqOxGK8Ff9M11i' },
] as const;

/** Get the RSVP tier for a given guest count */
export const getRsvpTier = (guestCount: number) => {
  return RSVP_TIERS.find(t => guestCount >= t.min && guestCount <= t.max) ?? RSVP_TIERS[RSVP_TIERS.length - 1];
};

/** Map Stripe product IDs back to plan DB IDs */
export const PRODUCT_TO_PLAN: Record<string, { plan_db_id: string; name: string }> = {
  [PLAN_PRICES.essential.product_id]: { plan_db_id: PLAN_PRICES.essential.plan_db_id, name: 'Essential' },
  [PLAN_PRICES.premium.product_id]: { plan_db_id: PLAN_PRICES.premium.plan_db_id, name: 'Premium' },
  [PLAN_PRICES.unlimited.product_id]: { plan_db_id: PLAN_PRICES.unlimited.plan_db_id, name: 'Unlimited' },
  [VENDOR_PRO.product_id]: { plan_db_id: VENDOR_PRO.plan_db_id, name: 'Vendor Pro' },
};
