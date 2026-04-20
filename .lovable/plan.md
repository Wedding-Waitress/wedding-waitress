

## Goal
Change Premium plan guest limit from **300 → 200** everywhere it's user-visible (frontend) and in the backend constants/database, while leaving Essential, Unlimited, and Vendor Pro untouched.

## Locked-Surface Override
The user is explicitly requesting changes to homepage pricing copy in `src/i18n/locales/*/landing.json` (normally locked per `LOCKED_TRANSLATION_KEYS.md`). Since the request directly demands "Apply this change EVERYWHERE… Homepage pricing section", we will treat this as owner-approved override **for the single key `pricing.premium.guests`** in every locale. No other locked content is touched.

## Changes

### 1. Frontend — Display strings
- **`src/lib/upgradePlans.ts`** (powers `/dashboard/upgrade` cards + `/dashboard/upgrade/checkout` summary)
  - `premium.description`: `Up to 300 guests · One event · Full access` → `Up to 200 guests · One event · Full access`
  - `premium.features`: replace `'Up to 300 guests'` with `'Up to 200 guests'`

- **`src/pages/Index.tsx`** line 408
  - `<span>Up to 300 guests</span>` → `<span>Up to 200 guests</span>`

- **`src/i18n/locales/{en,fr,de,es,it,nl,pt,ar,el,hi,ja,tr,vi,zh}/landing.json`** (all 14 locale files that ship a Premium card)
  - Key `pricing.premium.guests`: replace the literal `300` with `200` while preserving the surrounding translated text (e.g. `"Up to 300 guests · 12-month access"` → `"Up to 200 guests · 12-month access"`, `"Jusqu'à 300 invités · Accès 12 mois"` → `"Jusqu'à 200 invités · Accès 12 mois"`, etc.).
  - **No other keys in landing.json change.** SEO/blog paragraphs that mention `$300` etc. are untouched.

### 2. Backend — Plan constants & database
- **`src/lib/stripePrices.ts`**
  - `PLAN_PRICES.premium.guest_limit`: `300` → `200`

- **Database** (`subscription_plans` table) — create a Supabase migration:
  ```sql
  UPDATE public.subscription_plans
  SET guest_limit = 200
  WHERE id = '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'  -- Premium
    AND name = 'Premium';
  ```
  This propagates to anywhere the app reads `plans.guest_limit` at runtime (e.g. `useUserPlan`, `check_guest_limit` RPC, `UsageCard`).

### 3. Out of Scope (NOT changed)
- Pricing amounts (`price_aud`, `original_price_aud`, currency-specific prices in `currencyPricing.ts`).
- Stripe price IDs / product IDs.
- Layout, styling, component structure, CTA wiring.
- Essential / Unlimited / Vendor Pro guest values.
- Other "300" occurrences (300 DPI references, $300 cost-comparison paragraphs, RSVP tier `201–300 guests` bundle, debounce timers, CSS transitions). These are unrelated.

## Verification After Implementation
1. Homepage `/` (every supported language) → Premium card reads "Up to 200 guests".
2. `/dashboard/upgrade` → Premium card reads "Up to 200 guests".
3. `/dashboard/upgrade/checkout?plan=premium` → left summary lists "Up to 200 guests".
4. Account → Usage card guest progress for users on the Premium plan shows `X / 200`.
5. Creating/editing a Premium event enforces the new 200-guest limit via `check_guest_limit` RPC.
6. No remaining "300 guests" / "Up to 300" string anywhere except the unrelated $300 cost paragraphs and 300 DPI place-card copy.

