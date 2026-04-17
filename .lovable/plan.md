
## Plan: Public SEO Page for "My Events" + Pattern for All Future Features

### The pattern (read this first)
You're asking for a repeatable structure. Here's what I'm locking in for every feature from now on:

```
PUBLIC (indexable)         AUTH (noIndex)
/products/<feature>   ←→   /dashboard (tab)
```

- **Public page**: marketing/SEO landing, no login, indexable, links to `/dashboard` via CTA.
- **Dashboard tab**: the actual tool, auth-gated, `noIndex` (already done for My Events, Tables, Guest List, QR Code).

There's already a parallel `/features/<feature>` set of public pages (e.g. `/features/events`, `/features/guest-list`). I'll flag this below — you should decide if `/products/*` replaces them or sits alongside.

### This request: `/products/my-events`

**New file:** `src/pages/products/ProductMyEvents.tsx`

Layout (matches existing `FeaturePageLayout` aesthetic — white card, brand brown `#967A59`, Inter, mobile-first):

```
┌─────────────────────────────────────────┐
│  Header (shared site header)            │
├─────────────────────────────────────────┤
│  H1: Manage Your Wedding or Event Easily│
│  Lead paragraph                          │
│  [Start Planning Your Event] [Features] │
├─────────────────────────────────────────┤
│  H2: Create and manage multiple events  │
│  H2: Keep all your event details organised │
│  H2: Access everything from one dashboard │
│  H2: Simple and easy to use             │
├─────────────────────────────────────────┤
│  Final CTA → /dashboard                 │
├─────────────────────────────────────────┤
│  Footer                                  │
└─────────────────────────────────────────┘
```

**SEO via existing `<SeoHead>` component:**
- Title: `Manage Your Events Online | Wedding & Event Planner Tool`
- Description: `Easily create and manage your wedding or event in one place. Stay organised, track details, and plan your event effortlessly with Wedding Waitress.`
- Canonical: `/products/my-events`
- OG + Twitter auto-derived (default WW preview image)
- JSON-LD: `WebPage` + `BreadcrumbList` (Home → Products → My Events) for richer Google snippets
- **No `noIndex`** — this page must rank.

**Route registration:** add to `src/App.tsx`:
```tsx
<Route path="/products/my-events" element={<ProductMyEvents />} />
```

**Sitemap:** add `/products/my-events` to `public/sitemap.xml` so Google discovers it on next crawl.

### Things I'm flagging that you didn't mention (per your "tell me anything extra" instruction)

1. **Reusable layout component** — I'll create `src/components/Layout/ProductPageLayout.tsx` (mirrors `FeaturePageLayout`) so every future `/products/*` page is a 30-line file. Saves hours across the 13+ features coming.
2. **`/features/*` vs `/products/*` overlap** — you already have `/features/events`, `/features/guest-list`, etc. (13 of them). If both sets exist, Google sees duplicate-intent pages and may split ranking. **Recommendation:** decide one of these — I'll do whichever you pick on the next request:
   - (a) `/products/*` replaces `/features/*` (301 redirects from old URLs — preserves any existing link equity).
   - (b) `/products/*` is the new canonical; `/features/*` get `<link rel="canonical">` pointing to `/products/*` equivalents.
   - (c) Delete `/features/*` outright (loses any backlinks).
3. **Dashboard `noIndex`** — currently set per-tab via `SeoHead`. Safer + simpler: add `<meta name="robots" content="noindex,nofollow">` once at the `/dashboard` route level so every tab is protected even if a future tab forgets `SeoHead`. I'll do this as part of this change.
4. **`robots.txt` + `sitemap.xml`** — both exist. I'll add the new URL to the sitemap and bump `lastmod`. No robots.txt change needed (already allows `/products/*`).
5. **Internal linking** — I'll add a link to `/products/my-events` from the landing page footer's product list (if there's one) so Google's crawler finds it. *Will check first — Landing.tsx is locked, so if the footer is in a separate component I'll edit that; if it's inside `Landing.tsx` I'll skip and flag.*
6. **Open Graph image** — using default WW logo as you specified. Down the line, a feature-specific 1200×630 OG image per product page boosts social CTR ~2x. Flagged for later.

### Files to create / change

| File | Action |
|---|---|
| `src/pages/products/ProductMyEvents.tsx` | Create |
| `src/components/Layout/ProductPageLayout.tsx` | Create (reusable shell for all future `/products/*`) |
| `src/App.tsx` | Add route |
| `public/sitemap.xml` | Add new URL |
| `src/pages/Dashboard.tsx` | Add page-level `noIndex` `<SeoHead>` (defensive) |
| Footer component (TBD) | Add link to new product page if accessible |

### Out of scope (will need separate go-ahead)
- Resolving `/features/*` vs `/products/*` duplication (item 2 above) — pick a, b, or c.
- Building the other 12+ `/products/*` pages — you said you'll send them one by one. Layout component above will make each one ~5 mins.
- Custom OG images per product.
