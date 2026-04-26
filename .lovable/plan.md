## ⚠️ Locked-Surface Notice (owner approval required)

This work touches files explicitly marked **LOCKED PUBLIC SURFACE (2026-04-18)** in project memory and `LOCKED_TRANSLATION_KEYS.md`:

- `src/pages/Landing.tsx` (homepage sections + footer)
- `src/components/Layout/Header.tsx` (nav links)
- `src/App.tsx` (public routes)
- `/contact`, `/blog`, `/privacy`, `/terms`, `/cookies` (already exist — untouched)

By approving this plan you authorize the listed edits. **No visual styling, color, spacing, font, or component design will change** — only structure (new routes) and navigation targets (anchors → URLs).

---

## 1. New standalone pages (each = own URL, own SEO head, own H1)

Create the following pages by **extracting the existing JSX sections from `Landing.tsx`** verbatim (same components, same Tailwind classes) and wrapping them in a shared shell (Header + footer + `SeoHead`):

| Route | Page file | Source section in Landing.tsx | H1 |
|---|---|---|---|
| `/how-it-works` | `src/pages/HowItWorks.tsx` | `<section id="how-it-works">` (line 341) | "How Wedding Waitress Works" |
| `/features` | `src/pages/Features.tsx` | "Wedding Seating Chart Made Simple" grid of 13 feature cards | "All 13 Wedding Planning Features" |
| `/pricing` | `src/pages/Pricing.tsx` | `<PricingSection>` block | "Simple, Transparent Pricing" |
| `/faq` | `src/pages/Faq.tsx` | `<section id="faq">` (line 471) | "Frequently Asked Questions" |
| `/contact` | already exists ✅ | n/a | n/a |
| `/blog` | already exists ✅ | n/a | n/a |

Each new page:
- Uses `<SeoHead>` with unique title + description + canonical (`https://weddingwaitress.com/<path>`)
- Reuses the **existing** `<Header>` and Landing's footer JSX (extracted to a tiny `<PublicFooter>` component to avoid duplication — same markup, same locked grid layout)
- Single `<h1>` per page; existing card/section sub-headings stay as `<h2>`/`<h3>`

## 2. Features index + 13 individual feature pages

`/features/*` routes **already exist** (13 files in `src/pages/features/`) — no new feature pages needed. Plan only adds:

- New `/features` index page rendering the existing 13 feature cards from `Landing.tsx`
- Each card's CTA already routes to `/features/<slug>` — verified in current code
- Add unique `<SeoHead>` to each existing `Feature*.tsx` if missing (audit pass)

## 3. Homepage — keep short previews, link to full pages

`Landing.tsx` keeps **all existing sections visually unchanged**, but each preview section gets a "View all / Learn more" link to its dedicated page:

- "How it works" preview → "See full guide →" links to `/how-it-works`
- "Features" grid stays in full (it's the main showcase) → each card already links to `/features/<slug>`; add "View all features →" link to `/features`
- "Pricing" stays → "See pricing details →" links to `/pricing`
- "FAQ" stays → "Read all FAQs →" links to `/faq`
- "Contact" stays → "Contact page →" links to `/contact`

The section `id`s (`#how-it-works`, `#pricing`, `#faq`, `#contact`) **remain in the homepage DOM** so existing in-page anchors stay functional and no scroll behavior is lost.

## 4. Header navigation rewire (locked file — approval needed)

In `src/components/Layout/Header.tsx`:
- Replace `goToHash('how-it-works')` → `<Link to="/how-it-works">`
- Replace `goToHash('pricing')` → `<Link to="/pricing">`
- Replace `goToHash('faq')` → `<Link to="/faq">`
- Replace `goToHash('contact')` → `<Link to="/contact">` (already a real route)
- Add `<Link to="/features">` entry where appropriate
- Same change in mobile menu block
- `goToHash` helper kept for any remaining same-page anchors (or removed if unused)
- **Zero visual changes** — same classes, same labels, same order

Footer (`Landing.tsx` lines 638-640): replace `<a href="#guest-list">`, `#pricing`, `#faq` with `<Link to="/features">`, `/pricing`, `/faq`.

## 5. Routing additions in `src/App.tsx`

Add 4 new routes (above the catch-all `*`):
```
<Route path="/how-it-works" element={<HowItWorks />} />
<Route path="/features" element={<Features />} />
<Route path="/pricing" element={<Pricing />} />
<Route path="/faq" element={<Faq />} />
```

## 6. Sitemap update (`scripts/generate-sitemap.mjs`)

Append the 4 new paths with `priority: 0.9, changefreq: monthly`. Re-run `prebuild` so `public/sitemap.xml` regenerates on next deploy.

## 7. Technical SEO checklist (per page)

- [x] Unique `<title>` via `SeoHead`
- [x] Unique meta description
- [x] Canonical URL (auto from `SeoHead` using current path)
- [x] Single `<h1>`
- [x] Internal cross-links (Header + footer + homepage previews)
- [x] Lowercase, hyphenated URLs
- [x] No trailing-slash duplicates (React Router treats `/pricing` and `/pricing/` as same; canonical always emitted without trailing slash)

## 8. Out of scope / explicitly NOT changing

- Dashboard, `/dashboard/*`, app/auth functionality
- Visual design, colors, spacing, fonts, components, card layouts
- Existing 13 `/features/<slug>` pages (only audited for SeoHead)
- Existing `/products/*` SEO pages
- Auth modals, locked footer grid, locked dashboard surfaces
- i18n landing translation keys (re-used as-is in extracted pages)

## Files to create
- `src/pages/HowItWorks.tsx`
- `src/pages/Features.tsx`
- `src/pages/Pricing.tsx`
- `src/pages/Faq.tsx`
- `src/components/Layout/PublicFooter.tsx` (extracted shared footer — exact same markup as Landing footer)

## Files to edit (locked — approval required)
- `src/App.tsx` (+4 routes)
- `src/components/Layout/Header.tsx` (anchor → Link)
- `src/pages/Landing.tsx` (footer links + add "View all" CTAs; sections unchanged)
- `scripts/generate-sitemap.mjs` (+4 entries)

## Verification after implementation
- All 4 new URLs return 200 and render with full Header/footer
- Homepage still scrolls correctly to `#pricing`/`#faq`/`#how-it-works`/`#contact` if anyone hits a legacy anchor
- Header nav navigates via React Router (no full reload)
- Sitemap regenerated with 47 entries (43 + 4) and zero netlify URLs
- Dashboard, auth, public guest lookup untouched
