
## Plan: Public SEO Page `/products/tables`

### Files
- **Create** `src/pages/products/ProductTables.tsx` — uses `ProductPageLayout` with the supplied copy.
- **Edit** `src/App.tsx` — register `<Route path="/products/tables" element={<ProductTables />} />` above the catch-all.
- **Edit** `public/sitemap.xml` — add `/products/tables` (priority 0.9, today's lastmod).

### Component (preview)
```tsx
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductTables = () => (
  <ProductPageLayout
    pageTitle="Wedding Tables Planner | Create & Manage Tables Easily"
    metaDescription="Create and manage your wedding or event tables with ease. Add tables, set guest limits, and organise your seating layout effortlessly."
    breadcrumbLabel="Tables"
    h1="Create & Manage Your Event Tables"
    lead="Set up your tables in minutes. Organise your layout, customise table names, and control guest numbers with ease."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Add and customise tables', text: 'Create as many tables as you need and customise them to match your event.' },
      { heading: 'Set guest limits per table', text: 'Control how many guests can sit at each table.' },
      { heading: 'Rename tables to match your theme', text: 'Use names like "Family", "Friends", or custom table names.' },
      { heading: 'Organise your seating layout easily', text: 'Keep your event structured and easy to manage.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
```

`ProductPageLayout` already handles SeoHead (title, description, canonical), WebPage + BreadcrumbList JSON-LD, header, footer, and is **indexable by default** (no `noIndex`) — matches the My Events pattern exactly.

### Out of scope
- Photo & Video Sharing module from the project-knowledge prompt — separate, much larger build. Flag and tackle when you're ready.
- `/features/tables` vs `/products/tables` duplication — still pending your a/b/c decision from the My Events plan.
