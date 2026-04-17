
## Plan: Public SEO Page `/products/name-place-cards`

### Files
- **Create** `src/pages/products/ProductNamePlaceCards.tsx` — uses `ProductPageLayout`.
- **Edit** `src/App.tsx` — import + register route above catch-all.
- **Edit** `public/sitemap.xml` — add URL (priority 0.9).

### Component
```tsx
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductNamePlaceCards = () => (
  <ProductPageLayout
    pageTitle="Wedding Name Place Cards | Table Seating Cards Made Easy"
    metaDescription="Create and organise wedding name place cards for your guests. Keep your seating organised and make your event look elegant and professional."
    breadcrumbLabel="Name Place Cards"
    h1="Create Wedding Name Place Cards"
    lead="Easily organise guest seating with clean and elegant name place cards. Perfect for weddings and events of any size."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Create name place cards instantly', text: 'Quickly generate cards for all your guests.' },
      { heading: 'Keep seating organised and clear', text: 'Help guests find their seats with ease.' },
      { heading: 'Clean and elegant design', text: 'Perfect for weddings and formal events.' },
      { heading: 'Works with your guest list and tables', text: 'Everything stays connected and organised.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
```

Indexable by default; SEO, JSON-LD, canonical handled by `ProductPageLayout` — same pattern as My Events / Tables / Guest List / QR Code Seating Chart / Invitations & Cards.
