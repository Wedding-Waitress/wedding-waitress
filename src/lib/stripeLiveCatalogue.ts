/** Verified LIVE catalogue; identifiers alone never authorize a purchase. */
export const STRIPE_LIVE_ACCOUNT_ID = 'acct_1T0eMm5GzTmqOxGK';
export const STRIPE_LIVE_CATALOGUE = {
  "essential": {
    "key": "essential",
    "name": "Essential",
    "productId": "ww_live_20260914_v2_essential",
    "priceId": "price_1UFTfT5GzTmqOxGKWxqjYWed",
    "currency": "aud",
    "unitAmount": 19900,
    "taxBehavior": "exclusive"
  },
  "premium": {
    "key": "premium",
    "name": "Premium",
    "productId": "ww_live_20260914_v2_premium",
    "priceId": "price_1UFTfW5GzTmqOxGKjj1dBGKR",
    "currency": "aud",
    "unitAmount": 24900,
    "taxBehavior": "exclusive"
  },
  "unlimited": {
    "key": "unlimited",
    "name": "Ultimate",
    "productId": "ww_live_20260914_v2_unlimited",
    "priceId": "price_1UFTfa5GzTmqOxGK9EDWU9t6",
    "currency": "aud",
    "unitAmount": 29900,
    "taxBehavior": "exclusive"
  },
  "essential_to_premium": {
    "key": "essential_to_premium",
    "name": "Essential to Premium upgrade",
    "productId": "ww_live_20260914_v2_essential_to_premium",
    "priceId": "price_1UFTfd5GzTmqOxGKfwtvD4lt",
    "currency": "aud",
    "unitAmount": 5000,
    "taxBehavior": "exclusive"
  },
  "premium_to_unlimited": {
    "key": "premium_to_unlimited",
    "name": "Premium to Ultimate upgrade",
    "productId": "ww_live_20260914_v2_premium_to_unlimited",
    "priceId": "price_1UFTfh5GzTmqOxGKVIAEh8Qq",
    "currency": "aud",
    "unitAmount": 5000,
    "taxBehavior": "exclusive"
  },
  "essential_to_unlimited": {
    "key": "essential_to_unlimited",
    "name": "Essential to Ultimate upgrade",
    "productId": "ww_live_20260914_v2_essential_to_unlimited",
    "priceId": "price_1UFTfl5GzTmqOxGKAugEd75R",
    "currency": "aud",
    "unitAmount": 10000,
    "taxBehavior": "exclusive"
  },
  // Historical immutable provider Price for older sessions. New purchases use a
  // server-bound inline A$90 + A$9 GST quote (ww_additional_event_99_total_v1).
  "additional_event": {
    "key": "additional_event",
    "name": "Additional event",
    "productId": "ww_live_20260914_v2_additional_event",
    "priceId": "price_1UFTqL5GzTmqOxGKgPWVdCwr",
    "currency": "aud",
    "unitAmount": 9900,
    "taxBehavior": "exclusive"
  },
  "guest_capacity_10": {
    "key": "guest_capacity_10",
    "name": "10 additional guests",
    "productId": "ww_live_20260914_v2_guest_capacity_10",
    "priceId": "price_1UFTqV5GzTmqOxGKkLYcl2PS",
    "currency": "aud",
    "unitAmount": 1000,
    "taxBehavior": "exclusive"
  },
  "communication_10": {
    "key": "communication_10",
    "name": "10 shared Email and SMS credits",
    "productId": "ww_live_20260914_v2_communication_10",
    "priceId": "price_1UFTqt5GzTmqOxGKhwwnh4Wj",
    "currency": "aud",
    "unitAmount": 1000,
    "taxBehavior": "exclusive"
  },
  "communication_100": {
    "key": "communication_100",
    "name": "100 shared Email and SMS credits",
    "productId": "ww_live_20260914_v2_communication_100",
    "priceId": "price_1UFTr55GzTmqOxGKsh0sjgjK",
    "currency": "aud",
    "unitAmount": 4900,
    "taxBehavior": "exclusive"
  },
  "access_extension_month": {
    "key": "access_extension_month",
    "name": "One prepaid access-extension month",
    "productId": "ww_live_20260914_v2_access_extension_month",
    "priceId": "price_1UFTrF5GzTmqOxGK1ueAxUAi",
    "currency": "aud",
    "unitAmount": 2000,
    "taxBehavior": "exclusive"
  }
} as const;

