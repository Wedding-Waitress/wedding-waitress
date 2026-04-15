

# Plan: Make Language Switcher Fully Functional on Homepage

## Summary
The entire Landing page and Header have hardcoded English text. The existing `landing.json` files are outdated and don't match the current homepage content. This plan rewrites all 13 locale files with complete translations and updates `Landing.tsx` + `Header.tsx` to use `t()` from react-i18next.

## What Changes

### 1. Rewrite `src/i18n/locales/en/landing.json` (and all 12 other locales)

Replace the current small landing.json with a comprehensive structure covering every homepage section:

```json
{
  "nav": { "howItWorks", "products", "pricing", "faq", "contact", "signIn", "getStarted" },
  "hero": { "title1", "title2", "subtitle", "cta", "trusted" },
  "featureCards": { "sectionTitle", "sectionSubtitle", cards x13 (title + desc) },
  "alternating": { 13 features (title + desc + learnMore) },
  "extraGrid": { "title", 14 items (title + desc) },
  "pricing": { "title", "subtitle", "trialNote", "saveLine", plans x4, features, "approvalRequired", "forProfessionals", "mostPopular" },
  "testimonials": { "title", "subtitle", 6 quotes },
  "faq": { "title", "subtitle", 6 Q&A pairs },
  "contact": { "title", "subtitle", "name", "email", "message", "placeholder*", "sendButton", "sending", "sent" },
  "finalCta": { "title1", "title2", "subtitle", "cta" },
  "footer": { "tagline", "explore", "support", "features", "pricing", "faq", "contactUs", "privacy", "terms", "followUs", "copyright" }
}
```

**All 13 locales** (en, de, es, fr, it, nl, ja, ar, vi, zh, tr, el, hi) get properly translated versions. Hindi (`hi`) will be added as a new locale.

### 2. Add Hindi locale support

- Create `src/i18n/locales/hi/common.json`, `landing.json`, `dashboard.json`
- Register Hindi in `src/i18n/config.ts` (import + add to resources)

### 3. Update `src/pages/Landing.tsx`

- Add `const { t } = useTranslation('landing');` 
- Replace every hardcoded string with `t('key')` calls
- Move data arrays (featureCards, alternatingFeatures, extraFeatures, testimonials, faqItems) inside the component so they can use `t()`
- No layout or styling changes

### 4. Update `src/components/Layout/Header.tsx`

- Replace hardcoded nav labels ("How it Works", "Pricing", "FAQ", "Contact", "Sign In", "Get Started") with `t('landing:nav.howItWorks')` etc.
- Remove the "coming soon" toast for Hindi — all languages now fully supported
- Mobile menu labels also translated

### 5. localStorage persistence

Already configured in `i18n/config.ts` via `detection.caches: ['localStorage']` — no change needed. RTL for Arabic also already handled via the `languageChanged` event.

## Files Modified
1. `src/i18n/locales/en/landing.json` — Full rewrite with all homepage keys
2. `src/i18n/locales/de/landing.json` — German translations
3. `src/i18n/locales/es/landing.json` — Spanish translations
4. `src/i18n/locales/fr/landing.json` — French translations
5. `src/i18n/locales/it/landing.json` — Italian translations
6. `src/i18n/locales/nl/landing.json` — Dutch translations
7. `src/i18n/locales/ja/landing.json` — Japanese translations
8. `src/i18n/locales/ar/landing.json` — Arabic translations
9. `src/i18n/locales/vi/landing.json` — Vietnamese translations
10. `src/i18n/locales/zh/landing.json` — Chinese translations
11. `src/i18n/locales/tr/landing.json` — Turkish translations
12. `src/i18n/locales/el/landing.json` — Greek translations
13. `src/i18n/locales/hi/common.json` — New Hindi common
14. `src/i18n/locales/hi/landing.json` — New Hindi landing
15. `src/i18n/locales/hi/dashboard.json` — New Hindi dashboard (minimal placeholder)
16. `src/i18n/config.ts` — Add Hindi imports + resources
17. `src/pages/Landing.tsx` — Replace all hardcoded text with `t()` calls
18. `src/components/Layout/Header.tsx` — Translate nav labels, remove "coming soon" toast for hi

