
## Goal
Change all 4 CTA buttons on `/dashboard/upgrade` from "Start Planning Free" to "Upgrade Now". Homepage pricing section must remain untouched.

## Findings
- The pricing UI is shared between the homepage and `/dashboard/upgrade` via `src/components/Pricing/PricingSection.tsx`.
- All 4 CTA buttons currently render the i18n key `t('pricing.getStarted')` (which resolves to "Start Planning Free").
- The component already distinguishes the two contexts via the `onPlanSelect` prop:
  - **Homepage** (`Landing.tsx`) → no `onPlanSelect` passed.
  - **Dashboard upgrade** (`UpgradePricing.tsx`) → passes `onPlanSelect`.
- This means we can branch the button label safely on `onPlanSelect` without touching the homepage or any i18n landing files (locked surface respected).

## Changes

### 1. `src/components/Pricing/PricingSection.tsx`
- Add a constant near the top of the component: `const ctaLabel = onPlanSelect ? 'Upgrade Now' : t('pricing.getStarted');`
- Replace the 4 `{t('pricing.getStarted')}` occurrences inside the Essential, Premium, Unlimited, and Vendor Pro card buttons with `{ctaLabel}`.
- No other markup, classes, props, or logic change.

### 2. No other files modified
- `Landing.tsx` — untouched (still renders "Start Planning Free" via the i18n key).
- `UpgradePricing.tsx` — untouched (already passes `onPlanSelect`, which now triggers the new label).
- No i18n JSON edits (locked landing files preserved).
- No styling, pricing, or checkout logic changes.

## Verification
1. Visit `/` → all 4 pricing cards still show "Start Planning Free" (and translated equivalents in other languages).
2. Visit `/dashboard/upgrade` → all 4 cards (Essential, Premium, Unlimited, Vendor Pro) show "Upgrade Now".
3. Clicking any "Upgrade Now" button still routes to `/dashboard/upgrade/checkout?plan=<key>` with the correct Stripe price.
