
## Goal
Translate the body content of all 13 product pages (`products.myEvents`, `products.guestList`, `products.tables`, `products.qrSeating`, `products.invitationsCards`, `products.placeCards`, `products.tableCharts`, `products.floorPlan`, `products.dietary`, `products.fullSeating`, `products.kioskLiveView`, `products.djMc`, `products.runningSheet`) into the 12 non-English languages so the hero heading, lead paragraph, primary CTA button, the four highlight boxes, the final CTA heading/text/button label, and the SEO `pageTitle` / `metaDescription` all switch when a different language is chosen.

## Root cause
The page components (`ProductMyEvents.tsx` etc.) and the shared `ProductPageLayout.tsx` are wired correctly with `useTranslation('landing')` and `t()` calls. The keys exist in every locale file. The defect is purely in the **values**: every non-English `landing.json` contains verbatim English text under `products.*`, so i18next resolves and renders English. The "Explore More" cards and footer translate correctly because those keys (`explore.cards.*`, `footer.*`) were already localized.

This is the same class of bug as the recently-fixed blog body content.

## Scope per product (each entry has the same shape)
For each of the 13 products:
- `pageTitle` (browser tab + SEO)
- `metaDescription` (SEO)
- `h1` (hero heading — e.g. "Manage Your Wedding or Event Easily")
- `lead` (hero paragraph)
- `primaryCta` (e.g. "Start Planning Your Event")
- `h` (array of 4 [heading, text] pairs — the four white feature boxes)
- `finalCtaHeading` (where present)
- `finalCtaText` (where present)
- `finalCtaLabel` (final CTA button)

Total per language: ~13 × 12 strings ≈ 156 strings × 12 languages = ~1,872 translated strings.

## Plan

1. **Read English source** from `src/i18n/locales/en/landing.json` for the full `products.*` tree.
2. **Translate** each leaf string (and array entry) into all 12 non-English languages: `de, es, fr, it, nl, ja, ar, vi, zh, tr, el, hi`. Use the same AI-gateway translation script pattern that worked for the blog content. Arabic gets RTL-friendly punctuation. Brand names ("Wedding Waitress"), product names ("QR Code Seating Chart", "DJ-MC Questionnaire", "Place Cards"), and proper nouns stay in their original form per existing convention.
3. **Write back** into each `src/i18n/locales/<lang>/landing.json` — replacing only the values under `products.*`. Preserve every other key (`hero`, `explore`, `footer`, `blog`, `productPage`, etc.) untouched.
4. **Validate** that JSON shape stays identical (same keys, same array lengths — each `h` array still has 4 sub-arrays of length 2).

## Files to modify
- `src/i18n/locales/{de,es,fr,it,nl,ja,ar,vi,zh,tr,el,hi}/landing.json` — 12 files

## Out of scope
- English file (already correct, used as source).
- Any layout, design, component code, or routing — components are already wired correctly.
- Any other section of the site (hero, explore, blog, footer — already translated in earlier passes).

## Verification
- Switch language to JA, then visit `/products/my-events` → confirm hero heading, lead, button, the 4 highlight boxes, final CTA section all render in Japanese.
- Repeat spot-checks for ZH, AR, TR, EL on `/products/guest-list`, `/products/qr-code-seating-chart`, `/products/dj-mc-questionnaire`.
- Switch back to EN → confirm original English copy still appears.
