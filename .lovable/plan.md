
## Plan: Public SEO Page `/products/guest-list`

### Files
- **Create** `src/pages/products/ProductGuestList.tsx` — uses `ProductPageLayout` with supplied copy.
- **Edit** `src/App.tsx` — register route + import.
- **Edit** `public/sitemap.xml` — add `/products/guest-list` (priority 0.9).

### Component
```tsx
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductGuestList = () => (
  <ProductPageLayout
    pageTitle="Wedding Guest List Manager | Track RSVPs Easily"
    metaDescription="Manage your wedding guest list, track RSVPs, and send invitations via SMS or email. Stay organised and in control of your event."
    breadcrumbLabel="Guest List"
    h1="Manage Your Guest List & RSVPs"
    lead="Keep track of all your guests in one place. Send invitations, monitor RSVPs, and organise your event effortlessly."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Add and organise your guests', text: 'Easily manage individuals, couples, and families.' },
      { heading: 'Track RSVP responses in real-time', text: 'Stay updated on who is attending.' },
      { heading: 'Send invitations via SMS or email', text: 'Communicate with guests instantly.' },
      { heading: 'Stay organised and in control', text: 'Everything in one simple dashboard.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
```

Indexable by default (no `noIndex`), JSON-LD + canonical handled by layout — same pattern as My Events and Tables.

### Still pending (flagged previously, no action needed yet)
- `/features/*` vs `/products/*` duplication decision (a/b/c).
- Photo & Video Sharing module from project knowledge — separate large build.
