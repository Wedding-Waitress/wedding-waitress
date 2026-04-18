
## Goal
Apply a "do not modify" lock on the entire public homepage and all connected public pages, then verify it end-to-end before reporting done.

## Lock scope (public-facing only — dashboard/admin/kiosk excluded)

**Pages**
- `src/pages/Landing.tsx`, `Blog.tsx`, `BlogPost.tsx`, `Contact.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `CookiePolicy.tsx`, `NotFound.tsx`
- All 13 `src/pages/features/Feature*.tsx`
- All 13 `src/pages/products/Product*.tsx`

**Layout & shared components used by those pages**
- `src/components/Layout/Header.tsx`, `FeaturePageLayout.tsx`, `ProductPageLayout.tsx`
- `src/components/SEO/SeoHead.tsx`
- `src/components/auth/AuthGatedCtaLink.tsx`, `SignUpModal.tsx`, `SignInModal.tsx`, `EmbeddedSignUpForm.tsx`
- `src/components/ui/CookieBanner.tsx`, `LanguageSelector.tsx`, `CurrencySelector.tsx`, `Reveal.tsx`
- `src/components/Redirect.tsx`

**Content & i18n**
- `src/content/blogPosts.ts`
- All 13 `src/i18n/locales/*/landing.json`
- `src/i18n/config.ts`

**Routing wiring** — public routes in `src/App.tsx` (`/`, `/blog`, `/blog/:slug`, `/contact`, `/privacy`, `/terms`, `/cookies`, all `/features/*`, all `/products/*`)

## How to lock (zero functional changes)

1. **Header lock comment** added to the top of every TSX/TS file in scope:
   ```
   /**
    * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
    * Part of the approved public homepage surface (locked 2026-04-18).
    * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
    */
   ```
   For JSON files (no comments allowed), the lock is enforced via the central registry only.

2. **Central registry** — extend `LOCKED_TRANSLATION_KEYS.md` with a new section "Locked public pages & components (2026-04-18)" listing every file path above.

3. **Memory** — broaden `mem://standards/locked-translations.md` to "locked public surface" and refresh the Core line in `mem://index.md` so every future session sees the rule.

## Verification (must complete before reporting done)
- Open 3 sample locked TSX files → confirm header comment present.
- Open `LOCKED_TRANSLATION_KEYS.md` → confirm new section with full file list.
- Open `mem://index.md` → confirm Core line mentions the lock.
- Visual: nothing changes — homepage and all linked pages render identically (no copy, layout, or behavior change).

## Out of scope
Dashboard, admin, kiosk, guest-lookup, Supabase functions, English source copy, any layout/wiring/translation values.
