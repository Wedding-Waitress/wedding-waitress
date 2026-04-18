# 🔒 LOCKED TRANSLATION KEYS

**STATUS: PRODUCTION-LOCKED — DO NOT MODIFY without explicit owner approval.**

This document tracks translation key sets that have been reviewed and signed off
by the project owner. Future edits to these keys risk regressing previously
fixed copy and must be approved before changes are made.

When working in any locale file under `src/i18n/locales/<lang>/landing.json`,
check this list before editing.

---

## Locked key sets

| # | Key path | Locales | Locked on | Notes |
|---|----------|---------|-----------|-------|
| 1 | `blog.posts.*` (body content) | all 12 non-EN | 2026-04-17 | Full body translations |
| 2 | `products.*` (entire subtree) | all 12 non-EN | 2026-04-17 | All 13 product pages localized |
| 3 | `products.qrSeating.h1` | zh, ar, hi | 2026-04-18 | Native-script overrides for "QR Code" |
| 4 | `products.djMc.*` | all 12 non-EN | 2026-04-18 | Full DJ-MC fix incl. localized "Running Sheet" term |

## Locked code wiring

| File | What is locked | Locked on |
|------|---------------|-----------|
| `src/components/auth/AuthGatedCtaLink.tsx` | `alwaysSignUp` prop behavior | 2026-04-18 |
| `src/components/Layout/Header.tsx` | `alwaysSignUp` on getStarted CTA | 2026-04-18 |
| `src/pages/Landing.tsx` | `alwaysSignUp` on all hero/repeat/final CTAs | 2026-04-18 |
| `src/components/Layout/ProductPageLayout.tsx` | `alwaysSignUp` on primary + final CTAs | 2026-04-18 |

---

## Rules

1. **Never silently change** any value listed above.
2. If a fix is genuinely required, ask the owner first and add a row to the
   table with the new lock date.
3. When adding a new locked key set, append a row — do not rewrite history.
4. The English source (`src/i18n/locales/en/landing.json`) is the source of
   truth; non-English locked keys must stay semantically aligned with EN.

## nav.blog (Header navigation) — 13 locales
**Locked:** 2026-04-18
**Files:** `src/i18n/locales/{en,de,es,fr,it,nl,tr,vi,ja,zh,ar,hi,el}/landing.json` → `nav.blog`
**Wiring:** `src/components/Layout/Header.tsx` desktop + mobile Blog link uses `t('nav.blog')`.
DO NOT MODIFY without explicit owner approval.

---

## 🔒 Locked public pages & components (2026-04-18)

The entire public-facing homepage surface and all pages connected to it are
**PRODUCTION-LOCKED**. Every TSX/TS file below carries a header lock comment.
JSON locale files are locked via this registry only (JSON has no comments).

**Any change to any file in this list requires explicit owner approval.**

### Pages
- `src/pages/Landing.tsx`
- `src/pages/Blog.tsx`
- `src/pages/BlogPost.tsx`
- `src/pages/Contact.tsx`
- `src/pages/PrivacyPolicy.tsx`
- `src/pages/TermsOfService.tsx`
- `src/pages/CookiePolicy.tsx`
- `src/pages/NotFound.tsx`

### Feature pages (13)
- `src/pages/features/FeatureDietary.tsx`
- `src/pages/features/FeatureEvents.tsx`
- `src/pages/features/FeatureFloorPlan.tsx`
- `src/pages/features/FeatureFullSeating.tsx`
- `src/pages/features/FeatureGuestList.tsx`
- `src/pages/features/FeatureInvitations.tsx`
- `src/pages/features/FeaturePlaceCards.tsx`
- `src/pages/features/FeaturePlanning.tsx`
- `src/pages/features/FeatureQrSeating.tsx`
- `src/pages/features/FeatureSeating.tsx`
- `src/pages/features/FeatureTableCharts.tsx`
- `src/pages/features/FeatureDjMc.tsx`
- `src/pages/features/FeatureKiosk.tsx`

### Product pages (13)
- `src/pages/products/ProductTables.tsx`
- `src/pages/products/ProductDjMcQuestionnaire.tsx`
- `src/pages/products/ProductMyEvents.tsx`
- `src/pages/products/ProductFloorPlan.tsx`
- `src/pages/products/ProductGuestList.tsx`
- `src/pages/products/ProductDietaryRequirements.tsx`
- `src/pages/products/ProductNamePlaceCards.tsx`
- `src/pages/products/ProductQrCodeSeatingChart.tsx`
- `src/pages/products/ProductFullSeatingChart.tsx`
- `src/pages/products/ProductRunningSheet.tsx`
- `src/pages/products/ProductIndividualTableCharts.tsx`
- `src/pages/products/ProductKioskLiveView.tsx`
- `src/pages/products/ProductInvitationsCards.tsx`

### Layout & shared components
- `src/components/Layout/Header.tsx`
- `src/components/Layout/FeaturePageLayout.tsx`
- `src/components/Layout/ProductPageLayout.tsx`
- `src/components/SEO/SeoHead.tsx`
- `src/components/auth/AuthGatedCtaLink.tsx`
- `src/components/auth/SignUpModal.tsx`
- `src/components/auth/SignInModal.tsx`
- `src/components/auth/EmbeddedSignUpForm.tsx`
- `src/components/ui/CookieBanner.tsx`
- `src/components/ui/LanguageSelector.tsx`
- `src/components/ui/CurrencySelector.tsx`
- `src/components/ui/Reveal.tsx`
- `src/components/Redirect.tsx`

### Content & i18n
- `src/content/blogPosts.ts`
- `src/i18n/config.ts`
- `src/i18n/locales/{en,de,es,fr,it,nl,tr,vi,ja,zh,ar,hi,el}/landing.json` (all 13)

### Routing wiring (do not alter public routes in `src/App.tsx`)
- `/`, `/blog`, `/blog/:slug`, `/contact`, `/privacy`, `/terms`, `/cookies`
- All `/features/*` routes
- All `/products/*` routes

**Out of scope** (not locked by this section): authenticated dashboard,
admin, kiosk, guest-lookup, Supabase edge functions.
