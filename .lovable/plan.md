
## Plan: Add SEO Metadata to Tables Page

### Scope
"Tables" is a dashboard tab (`activeTab === 'table-list'`) inside `/dashboard` — auth-gated, not a standalone public route. Same pattern as the My Events tab we just did.

### What I can do
- Add `<SeoHead>` to the Tables tab component to set browser tab title, meta description, and OG tags.
- Use `noIndex` because `/dashboard` is behind auth and shouldn't appear in Google.

### What I CANNOT do (and why)
- **URL slug `/products/tables`** — Tables is not a standalone route. It's a tab swap inside `/dashboard`. Creating a public `/products/tables` route would be a separate, much larger task (new public marketing page, like the existing `/features/*` pages). Flagging — not doing as part of "metadata only".
- **H1 + H2 headings on page** — the request says "Do NOT change layout or functionality — metadata only", which contradicts adding new headings. I'll skip the visible H1/H2 changes and stick to metadata, matching the explicit instruction.
- **SEO keywords meta tag** — Google ignores `<meta name="keywords">` since ~2009. I'll skip it (no value, adds noise). Happy to add it if you insist.

### File to find & edit
Need to locate the Tables tab component first — likely `src/components/Dashboard/Tables/` or rendered inline in `Dashboard.tsx` under `case 'table-list'`. Will read `Dashboard.tsx` to confirm exact component, then add `<SeoHead>` at the top of its JSX.

### Change
```tsx
<SeoHead
  title="Tables Planner | Create & Manage Wedding Tables Easily"
  description="Create and manage your wedding or event tables with ease. Add tables, set guest limits, rename tables, and organise seating effortlessly with Wedding Waitress."
  noIndex
/>
```

OG title/description are auto-derived from `title`/`description` inside `SeoHead`, which already emits the full OG + Twitter set with the default Wedding Waitress preview image. No extra props needed.

### Files changed
- 1 file: the Tables tab component (TBD after reading `Dashboard.tsx` — likely `src/components/Dashboard/Tables/SortableTablesGrid.tsx` or a parent wrapper).

### Out of scope (flagged above)
- Creating a public `/products/tables` route
- Adding visible H1/H2 to the page
- `<meta name="keywords">` (deprecated by search engines)

If you want the public `/products/tables` marketing page with the H1/H2 copy, say the word and I'll plan that as a separate piece of work modeled on the existing `/features/*` pages.
