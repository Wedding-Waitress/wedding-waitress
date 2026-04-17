
## Plan: Add SEO Metadata to "My Events" Page

### Scope
"My Events" is an **authenticated dashboard tab** (not a standalone route) — it renders inside `Dashboard.tsx` when `activeTab === 'my-events'`. It lives at `/dashboard`, behind auth, so it won't be indexed by Google. Still, setting a proper `<title>` is a UX win (browser tab, bookmarks, history).

### Change
In `src/components/Dashboard/MyEventsPage.tsx`, add `<SeoHead>` at the top of the rendered output:

```tsx
<SeoHead
  title="Manage Your Wedding Events | Wedding Waitress"
  description="Effortlessly organize all your wedding events in one place—track guest lists, seating, and more with Wedding Waitress."
  noIndex
/>
```

- Uses the existing `SeoHead` component (`src/components/SEO/SeoHead.tsx`).
- `noIndex` is set because `/dashboard` is auth-gated — we don't want it in search results, but the title still updates the browser tab.

### Files changed
- `src/components/Dashboard/MyEventsPage.tsx` — add import + `<SeoHead>` element.

### Out of scope
- No other dashboard tabs touched.
- No layout / styling changes.
