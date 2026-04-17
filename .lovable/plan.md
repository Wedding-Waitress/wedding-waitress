
## Plan: Homepage SEO Optimisation

### Files
- **Edit** `src/pages/Landing.tsx`
  1. Import `SeoHead` from `@/components/SEO/SeoHead` and `Link` (already imported).
  2. Inside the top-level `Landing` return (just after `<Header />`, line 268), render:
     ```tsx
     <SeoHead
       title="Wedding Planning App | Guest List, Seating Chart & Invitations"
       description="Plan your wedding or event with ease. Manage your guest list, seating chart, invitations, and more — all in one simple platform."
       canonicalPath="/"
     />
     ```
     (Indexable — no `noIndex`. `HelmetProvider` confirmed in `src/main.tsx`.)
  3. Replace the hero `<h1>` block (lines 135–144) with the exact requested copy:
     - H1: **"All-In-One Wedding Planning Made Simple"**
     - Lead `<p>`: **"Plan your entire wedding or event from one place. Manage guests, create seating charts, send invitations, and stay organised every step of the way."**
     - Keep existing white text + drop-shadow styling so it stays legible over the hero video.
     - Remove the i18n `t('hero.title1/2/3/trustLine')` calls in this block (kept elsewhere).
  4. Update hero CTA area (lines 145–152): keep the existing `SignUpModal` "Start Planning Your Event" button, and add a secondary `<Link to="/products/my-events">` button styled as outline white → "View All Features".
  5. Insert a new section directly after `<HeroSection />` (line 271), before the existing Feature Cards section, called **"Explore the Platform"** — a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) of 5 white `rounded-2xl` cards, each a `<Link>` to its product page:
     - Manage Your Guest List Easily → `/products/guest-list` (icon: `Users`)
     - Plan Your Tables → `/products/tables` (icon: `MapPin`)
     - QR Code Seating Chart → `/products/qr-code-seating-chart` (icon: `QrCode`)
     - Send Digital Invitations → `/products/invitations-cards` (icon: `Mail`)
     - Name Place Cards → `/products/name-place-cards` (icon: `CreditCard`)
     - Each card: brand brown `#967A59` icon circle, bold heading, muted text, hover lift.
  6. No other sections (pricing, testimonials, video, footer) touched.

### Notes
- Indexable by default; canonical = `https://weddingwaitress.com/`.
- All 5 internal product links exist (`/products/guest-list`, `/tables`, `/qr-code-seating-chart`, `/invitations-cards`, `/name-place-cards`).
- Brand-consistent styling: white cards, brown accent, rounded-2xl, subtle shadow — matches `mem://design/design-system`.
- Hero H1/lead become hard-coded English (per spec); rest of Landing keeps i18n.
