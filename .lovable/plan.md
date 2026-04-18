

## Goal
Make the entire homepage hero, "Explore the Platform" section, and all 13 product pages fully translate when the user changes language. No design/layout changes — only swap hardcoded English for `t()` calls and add the missing translation keys for all 13 supported languages.

## Root cause
Three separate problems:

1. **Landing hero is hardcoded.** `src/pages/Landing.tsx` lines 154–171 use literal English for the H1 ("All-In-One Wedding & Event Planning…"), the paragraph ("Plan your entire wedding…"), and both CTA buttons ("Start Planning Your Event", "View All Features"), even though `useTranslation('landing')` is already set up.
2. **"Explore the Platform" section is hardcoded.** `src/pages/Landing.tsx` lines 366–402 — heading, subtitle, all 13 card titles + descriptions, and "Learn more" labels are literal English. The feature-card row also has a hardcoded "Learn more" (line 436).
3. **All 13 `/products/*` pages have zero translation.** Each page (`ProductMyEvents.tsx`, `ProductGuestList.tsx`, `ProductTables.tsx`, `ProductQrCodeSeatingChart.tsx`, `ProductInvitationsCards.tsx`, `ProductNamePlaceCards.tsx`, `ProductIndividualTableCharts.tsx`, `ProductFloorPlan.tsx`, `ProductDietaryRequirements.tsx`, `ProductFullSeatingChart.tsx`, `ProductKioskLiveView.tsx`, `ProductDjMcQuestionnaire.tsx`, `ProductRunningSheet.tsx`) passes literal English strings to `ProductPageLayout`. The layout itself also hardcodes "Explore More Features", footer headings ("Features", "Get Started"), product card labels in the footer, "Start Planning", "Home", and the tagline.

Translation file audit: `zh` is already complete (373 keys), but `ar/el/fr/vi` are missing 22 keys and `de/es/it/nl/ja/tr/hi` are missing 9 keys — these gaps need filling so existing translated content stops falling back to English.

## Implementation plan

### 1. Wire translations into Landing hero
- `src/pages/Landing.tsx` lines 154–171: replace hardcoded text with:
  - `t('heroMain.title')` (with line break support via two keys: `title1` / `title2`)
  - `t('heroMain.subtitle')`
  - `t('heroMain.ctaPrimary')`
  - `t('heroMain.ctaSecondary')`
- Reuse existing keys where possible; otherwise add new keys under a new `heroMain` namespace (keep the existing `hero.*` keys untouched to avoid breaking anything else).

### 2. Wire translations into "Explore the Platform" section
- Lines 366–402: build the 13-item array using `t()` calls keyed by product slug (e.g. `explore.cards.myEvents.heading` / `explore.cards.myEvents.text`).
- Replace hardcoded "Explore the Platform", subtitle, and "Learn more" with `t('explore.title')`, `t('explore.subtitle')`, `t('explore.learnMore')`.
- Line 436: replace the inline "Learn more" with `t('featureCards.learnMore')`.

### 3. Make `ProductPageLayout` translation-aware
- `src/components/Layout/ProductPageLayout.tsx`: add `useTranslation('landing')`.
- Replace hardcoded strings:
  - "Explore More Features" → `t('productPage.exploreMore')`
  - Footer "Wedding Waitress" tagline → `t('productPage.footerTagline')`
  - "Features" / "Get Started" headings → `t('productPage.footerFeatures')` / `t('productPage.footerGetStarted')`
  - "Start Planning" / "Home" links → `t('productPage.startPlanning')` / `t('productPage.home')`
  - Copyright → `t('productPage.copyright', { year })`
  - The `ALL_PRODUCTS` array (used in footer + Explore More Features cards) → translate `heading` and `text` per item via `t('explore.cards.<key>.heading')` etc.
- Default CTA labels (`'Start Planning Your Event'`, `'Ready to get started?'`, etc.) become translation-aware fallbacks.

### 4. Make each of the 13 product pages translation-aware
- Convert each `Product*.tsx` from a static prop-passing component into a small functional component that calls `useTranslation('landing')` and passes translated strings into `ProductPageLayout`.
- Each page maps to a namespaced block, e.g. `products.myEvents.{pageTitle, metaDescription, h1, lead, primaryCta, secondaryCta?, highlights[0..n].{heading,text}, finalCtaHeading, finalCtaText, finalCtaLabel}`.
- Highlights array length stays the same per page; we just pull each entry's heading/text from the JSON.

### 5. Add the new keys to all 13 locale files
- Add the new namespaces (`heroMain`, `explore`, `productPage`, `products.<slug>`) to **`en/landing.json` first** as the source of truth.
- Translate into all 12 other languages: `de, es, fr, it, nl, ja, ar, vi, zh, tr, el, hi`.
- Also fill the existing **gaps** (22 missing keys in ar/el/fr/vi; 9 missing in de/es/it/nl/ja/tr/hi) so the rest of the homepage that already uses `t()` no longer falls back to English.
- For Arabic, ensure RTL-friendly text (no LTR-only punctuation issues).

### 6. Verification (after implementation)
- Switch language to AR, ZH, TR, EL on:
  - Homepage → hero title/subtitle/buttons translate; "Explore the Platform" heading + all 13 cards translate; "Learn more" translates.
  - Each of the 13 `/products/*` pages → H1, lead paragraph, both CTA buttons, all highlight cards, "Ready to get started?" section, footer headings, product list, "Start Planning", copyright all translate.
- Confirm AR page direction stays RTL.
- Confirm no English fallback remains for the targeted sections.
- Confirm no visual/layout regression on desktop and mobile (1336×853 and small-screen).

## Out of scope (not touched)
- Any other section of the homepage that's already correctly translated (pricing, FAQ, testimonials, alternating features, `featureCards`, contact form, blog).
- `/features/*` pages.
- Dashboard, admin, kiosk, guest-lookup pages.
- Visual styling, layout, fonts, colors, button design, animations.
- The `SignUpModal` and auth flow.
- The locked Full Seating Chart and Place Cards features.

## Files to modify
- `src/pages/Landing.tsx` (hero + Explore the Platform + feature-cards "Learn more")
- `src/components/Layout/ProductPageLayout.tsx` (Explore More + footer + defaults)
- All 13 `src/pages/products/*.tsx` (convert to translation-aware)
- `src/i18n/locales/en/landing.json` (add new key tree as source of truth)
- `src/i18n/locales/{de,es,fr,it,nl,ja,ar,vi,zh,tr,el,hi}/landing.json` (add translated new keys + fill existing missing keys)

