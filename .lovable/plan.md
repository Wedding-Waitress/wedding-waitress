
## Plan: Add SEO Metadata to Guest List Tab

### Scope
"Guest List" is the dashboard tab `activeTab === 'guest-list'` inside `/dashboard` — auth-gated, same pattern as My Events and Tables.

### Change
Add a `guestListSeo` constant in `src/pages/Dashboard.tsx` and inject it into the `guest-list` case render branch(es):

```tsx
const guestListSeo = (
  <SeoHead
    title="Wedding Guest List Manager | Track RSVPs & Guests Easily"
    description="Easily manage your wedding guest list, track RSVPs, organise guests, and send invitations via email or SMS. The simplest way to stay organised for your big day."
    noIndex
  />
);
```

OG title/description auto-derived by `SeoHead`. `noIndex` because dashboard is auth-gated.

### Skipped (flagged, same reasons as Tables plan)
- **`/products/guest-list` URL slug** — Guest List is a tab, not a route. Public marketing page would be a separate task.
- **H1 / H2 visible headings** — request says "metadata only, do NOT change layout".
- **`<meta name="keywords">`** — ignored by Google since ~2009.

If you want a public `/products/guest-list` marketing page with the H1/H2 copy, ask separately.

### Files changed
- `src/pages/Dashboard.tsx` (1 file)
