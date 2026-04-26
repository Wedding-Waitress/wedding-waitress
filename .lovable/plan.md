
## Status: Almost everything is already done

Reviewing the codebase against your 11-point checklist, the previous turn already implemented:

| # | Requirement | Status |
|---|---|---|
| 1 | Standalone pages `/how-it-works`, `/features`, `/pricing`, `/faq` (with Header, Footer, H1, SeoHead) | ✅ Done |
| 2 | `/features` shows all 13 feature cards, each linking to `/features/[name]` | ✅ Done (`src/pages/Features.tsx`) |
| 3 | Clicking "Products" navigates to `/features` (dropdown still works) | ⚠️ **Pending — only this remains** |
| 4 | Homepage sections preserved (Landing.tsx untouched in those sections) | ✅ Done |
| 5 | Header desktop + mobile use real `<Link to="...">`, no anchors | ✅ Done |
| 6 | Routes registered in `App.tsx` above catch-all `*` | ✅ Done |
| 7 | Footer uses real page links (`PublicFooter.tsx`) | ✅ Done |
| 8 | Sitemap updated, only `weddingwaitress.com` URLs | ✅ Done (47 URLs) |
| 9 | Unique title / description / canonical / H1 on every new page | ✅ Done |
| 10 | Dashboard, auth, styling, existing feature pages, blog, contact untouched | ✅ Done |
| 11 | All routes return 200, lowercase + hyphenated | ✅ Done |

## The one remaining change: Products trigger → `/features`

**File:** `src/components/Layout/Header.tsx` (lines 131–151)

Currently the desktop `DropdownMenuTrigger` is a plain `<Button>` that only toggles the menu. We need it to **also** navigate to `/features` on click, while preserving:
- The dropdown opening behavior (sub-links still appear)
- The exact visual styling (same Button, same chevron, same hover)
- Mobile menu (already has a separate `/features` link — no change needed)

### Approach

Wrap the trigger Button in a `<Link to="/features">` and let the dropdown open via hover/focus or via a separate chevron click. The cleanest minimal-impact pattern Radix supports:

```tsx
<DropdownMenu>
  <div className="flex items-center">
    <Link
      to="/features"
      onClick={() => window.scrollTo(0, 0)}
      className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80"
    >
      {t('nav.products')}
    </Link>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" aria-label="Open products menu" className="min-h-[44px] px-2 text-gray-800 hover:text-gray-950 hover:bg-gray-50/80">
        <ChevronDown className="w-3 h-3" />
      </Button>
    </DropdownMenuTrigger>
  </div>
  <DropdownMenuContent align="end" className="...">
    {productLinks.map(...)}
  </DropdownMenuContent>
</DropdownMenu>
```

This gives:
- **Click "Products" text** → navigates to `/features` (new SEO behavior)
- **Click the chevron** → opens the dropdown (existing behavior preserved)
- **Visual:** virtually identical — text + chevron sit side-by-side just like before

### Lock-file note

`Header.tsx` is marked production-locked. This is the same file the previous turn already modified (with approval) to swap anchor nav for real `<Link>` routes. This change continues that same approved SEO restructure and does not alter colors, spacing, fonts, or the dropdown contents — only splits the existing trigger into "label link + chevron trigger".

### Files to edit
- `src/components/Layout/Header.tsx` — only lines 131–151 (the desktop Products dropdown block)

### Files NOT touched
- Mobile menu (already correct)
- `Landing.tsx`, `App.tsx`, `PublicFooter.tsx`, sitemap, all `/features/*` pages, `/products/*` pages, dashboard, auth — all untouched

### Verification after implementation
1. Click "Products" text on desktop header → routes to `/features` (200, shows all 13 cards)
2. Click chevron next to Products → dropdown opens with the 13 sub-links
3. Mobile hamburger → still shows `/features` link + sub-links unchanged
4. No visual regression on header

Approve to apply this single targeted change.
