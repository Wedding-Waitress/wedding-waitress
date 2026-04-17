
## Plan: Public SEO Page `/products/invitations-cards`

### Files
- **Create** `src/pages/products/ProductInvitationsCards.tsx` — uses `ProductPageLayout`.
- **Edit** `src/App.tsx` — import + register route above catch-all.
- **Edit** `public/sitemap.xml` — add URL (priority 0.9).

### Component
```tsx
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductInvitationsCards = () => (
  <ProductPageLayout
    pageTitle="Wedding Invitations & Digital Cards | Send Invites Online"
    metaDescription="Create and send beautiful wedding invitations and digital cards online. Share your event details and impress your guests."
    breadcrumbLabel="Invitations & Cards"
    h1="Create & Send Wedding Invitations Online"
    lead="Design and send stunning digital invitations in minutes. Share your wedding details and give your guests a beautiful first impression."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Send invitations via SMS or email', text: 'Reach your guests instantly.' },
      { heading: 'Beautiful and modern digital cards', text: 'Impress your guests from the start.' },
      { heading: 'Simple and easy to use', text: 'No design skills needed.' },
      { heading: 'Works with your guest list', text: 'Keep everything connected in one place.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
```

Indexable by default; SEO, JSON-LD, canonical handled by `ProductPageLayout` — same pattern as My Events / Tables / Guest List / QR Code Seating Chart.
