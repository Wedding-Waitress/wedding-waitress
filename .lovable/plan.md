# SEO URL Restructure — Clean Root-Level Product URLs

Move all 13 product pages from `/products/{slug}` to clean root-level `/{slug}`, add a `/products` index page, redirect all old URLs, update navigation + sitemap.

---

## 1. New `/products` index page

Create `src/pages/Products.tsx` — a thin wrapper that renders the same 13-card layout as `/features`, but with:
- `<SeoHead>` title `"All Products | Wedding Waitress"`, description, canonical `/products`.
- One H1: "Wedding Waitress Products".
- Each card links to the new clean URL (e.g. `/guest-list`).

`/features` page is kept (it already exists and is indexed) — its cards will also be updated to point to the new clean URLs.

---

## 2. Promote 13 product pages to root URLs

In `src/App.tsx`, register new root-level routes pointing to the existing `Product*` page components (no page redesign — same components, just new URL):

| New URL | Component |
|---|---|
| `/my-events` | `ProductMyEvents` |
| `/guest-list` | `ProductGuestList` |
| `/tables` | `ProductTables` |
| `/qr-code-seating-chart` | `ProductQrCodeSeatingChart` |
| `/invitations-cards` | `ProductInvitationsCards` |
| `/name-place-cards` | `ProductNamePlaceCards` |
| `/individual-table-charts` | `ProductIndividualTableCharts` |
| `/floor-plan` | `ProductFloorPlan` |
| `/dietary-requirements` | `ProductDietaryRequirements` |
| `/full-seating-chart` | `ProductFullSeatingChart` |
| `/kiosk-live-view` | `ProductKioskLiveView` |
| `/dj-mc-questionnaire` | `ProductDjMcQuestionnaire` |
| `/running-sheet-product` | `ProductRunningSheet` |

**Conflict note:** the path `/running-sheet/:eventSlug/:token` and `/running-sheet/:token` already exist for the **public DJ-MC/running sheet share view** (used by vendors). I cannot reuse `/running-sheet` as the marketing page without breaking those public share URLs.

**Resolution:** Use `/running-sheet-product` for the marketing page (clean, hyphenated, indexable). The dropdown label stays "Running Sheet". The old `/products/running-sheet` redirects to `/running-sheet-product`. I'll flag this for your confirmation — alternative is to re-namespace the public share routes (e.g. `/rs-share/:token`), which would invalidate any QR codes already printed.

Each `Product*` component already has its own `SeoHead`. I'll update the `canonicalPath` prop on each to its new clean URL so canonicals are correct.

---

## 3. Client-side redirects (replaces 301s)

**Important honesty note:** Lovable hosting is SPA-only and does not process `_redirects`, `netlify.toml`, `vercel.json`, or any server-side redirect config. True HTTP 301 redirects are not possible. Instead I'll use React Router `<Navigate replace>` components, which:
- Instantly redirect users to the new URL.
- Update the URL bar (Google sees the new URL on next crawl).
- Combined with the new pages' canonical tags pointing to the clean URLs, Google will consolidate the old → new within 1–2 crawl cycles.

Add redirect routes in `src/App.tsx`:
```
/products/my-events → /my-events
/products/guest-list → /guest-list
/products/tables → /tables
/products/qr-code-seating-chart → /qr-code-seating-chart
/products/invitations-cards → /invitations-cards
/products/name-place-cards → /name-place-cards
/products/individual-table-charts → /individual-table-charts
/products/floor-plan → /floor-plan
/products/dietary-requirements → /dietary-requirements
/products/full-seating-chart → /full-seating-chart
/products/kiosk-live-view → /kiosk-live-view
/products/dj-mc-questionnaire → /dj-mc-questionnaire
/products/running-sheet → /running-sheet-product
```

**`/features/*` redirects:** the brief says redirect these too. I'll redirect each `/features/{slug}` to its corresponding clean URL using the `Feature*` → `Product*` mapping. The `/features` index itself stays (keeps the existing card layout), but its cards now link to clean URLs.

---

## 4. Update internal links

- **`src/components/Layout/Header.tsx`** — update the `productLinks` array (desktop dropdown + mobile menu) so all 13 entries use the new clean URLs. Header is locked, but this is link-only (no styling change) — required by your brief.
- **`src/pages/Features.tsx`** — update each card's `route` to the new clean URL.
- **`src/components/Layout/PublicFooter.tsx`** — update any product links to clean URLs.
- **`src/pages/Landing.tsx`** — update any homepage feature card hrefs/CTAs that point to `/products/*` or `/features/*`.
- Search the codebase (`rg "/products/"` and `rg "/features/"`) and update remaining references in product/feature page cross-links.

---

## 5. Sitemap

Update `scripts/generate-sitemap.mjs`:
- **Add:** `/products` and the 13 clean URLs (priority 0.9).
- **Remove:** all 13 `/products/{slug}` entries and all 13 `/features/{slug}` entries.
- **Keep:** `/`, `/how-it-works`, `/features`, `/products`, `/pricing`, `/faq`, `/blog`, blog posts, legal pages.
- Run `bun scripts/generate-sitemap.mjs` to regenerate `public/sitemap.xml`.

---

## 6. Per-page SEO updates

For each `Product*` page, set `canonicalPath="/{new-clean-url}"` on its `<SeoHead>`. Confirm each has a single H1, unique title, and meta description (most already do — I'll audit and fix any gaps).

---

## 7. Out of scope (won't touch)

- Visual design, layout, colors, spacing, fonts.
- Dashboard, auth, backend, RLS, edge functions.
- `/features` page layout (only its card links update).
- Public share routes (`/dj-mc/...`, `/running-sheet/:token`, `/seating-chart/...`, `/s/...`, `/kiosk/...`, `/qr/:code`).
- Locked features (Full Seating Chart, Place Cards) — I only touch their marketing page metadata.

---

## 8. Verification after implementation

1. Navigate to each of the 14 new URLs (`/products` + 13 clean URLs) and confirm 200 + correct page renders.
2. Navigate to each old `/products/*` and `/features/*` URL and confirm instant redirect to the new clean URL.
3. Confirm header dropdown links go to new URLs.
4. Confirm `public/sitemap.xml` contains only `weddingwaitress.com` URLs, no `/products/*` or `/features/{slug}` entries, and lists all 13 clean URLs.
5. Confirm project compiles (no TS errors).

---

## Two things I need from you

1. **Confirm `/running-sheet-product` is acceptable** for the marketing page URL (since `/running-sheet/...` is reserved for public vendor share links). Or tell me to rename the public share route instead (will invalidate existing share tokens already sent to vendors).
2. **Acknowledge the redirect approach:** Lovable hosting cannot serve true HTTP 301s. I'll use React Router client-side redirects + canonical tags, which is the SEO-correct and only available approach on this hosting. Google will consolidate within 1–2 crawls.
