
## Plan: Public SEO Page `/products/qr-code-seating-chart`

### Files
- **Create** `src/pages/products/ProductQrCodeSeatingChart.tsx` — uses `ProductPageLayout`.
- **Edit** `src/App.tsx` — import + register route above catch-all.
- **Edit** `public/sitemap.xml` — add URL (priority 0.9).

### Component
```tsx
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductQrCodeSeatingChart = () => (
  <ProductPageLayout
    pageTitle="QR Code Seating Chart | Digital Wedding Seating Plan"
    metaDescription="Create a digital wedding seating chart with a QR code. Guests can scan to instantly find their table. No printing needed."
    breadcrumbLabel="QR Code Seating Chart"
    h1="QR Code Seating Chart for Your Wedding"
    lead="Let your guests find their seat instantly. Simply generate a QR code and allow guests to scan and view their table in seconds."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Guests scan to find their seat instantly', text: 'No confusion or waiting around.' },
      { heading: 'Generate a unique QR code for your event', text: 'Easy to share and display at your venue.' },
      { heading: 'No printing required', text: 'Save money and go fully digital.' },
      { heading: 'Modern and stress-free solution', text: 'Perfect for today\'s weddings and events.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
```

Indexable by default; SEO, JSON-LD, canonical handled by `ProductPageLayout` — same pattern as My Events / Tables / Guest List.
