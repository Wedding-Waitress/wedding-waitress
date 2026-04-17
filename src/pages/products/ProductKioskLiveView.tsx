import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductKioskLiveView = () => (
  <ProductPageLayout
    pageTitle="Wedding Seating Kiosk Display | Live Guest View"
    metaDescription="Display your wedding seating chart on a screen or kiosk. Guests can easily find their table in real-time at your event."
    breadcrumbLabel="Kiosk Live View"
    h1="Kiosk Live Seating View for Your Event"
    lead="Display your seating chart on a screen at your venue. Let guests quickly find their table in a modern and interactive way."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Display seating on a live screen', text: 'Perfect for venue entrances.' },
      { heading: 'Guests find their table instantly', text: 'No confusion or waiting.' },
      { heading: 'Modern and interactive experience', text: 'Upgrade your event setup.' },
      { heading: 'Works with your QR seating system', text: 'Fully connected experience.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
