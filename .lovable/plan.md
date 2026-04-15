

# Plan: Premium One-Page Homepage Rebuild for Wedding Waitress

## Summary
Complete rewrite of `Landing.tsx` with all the requested sections: hero with video background, how-it-works, 7 feature sections with alternating layouts, social proof/testimonials, pricing, FAQ, final CTA, and footer. The Header will be updated to match the new nav structure with Products dropdown that scrolls to sections.

## Sections to Build (in order)

1. **Header** — Update nav links to match spec (How It Works, Products dropdown with scroll-to anchors, Pricing, FAQ, Contact). Keep Sign In / Sign Up / Language selector. Products dropdown items: Guest List, Tables & Seating, QR Code Seating, Running Sheet, Invitations & Cards.

2. **Hero Section** — Full-width with a looping background video (wedding reception footage from a free stock URL or placeholder with dark purple gradient overlay `rgba(0,0,0,0.35)`). Left side: badge, heading ("Plan Your Wedding. Seat Every Guest Perfectly."), subheading, two buttons, trust text. Right side: glassmorphism signup card (keep existing form logic).

3. **How It Works** — 4 horizontal cards: Create Event, Add Guests, Organise Seating, Share & Manage. Each with icon, title, description.

4. **Feature Sections (7 total)** — Alternating image-left/text-right layout. Each with title, description paragraph, bullet points with check icons. Sections: Guest List, Tables & Seating, QR Code Seating, Running Sheet, DJ & Music, Floor Plan, Invitations. Use placeholder images with glassmorphism card style.

5. **Social Proof** — "Loved by Couples Everywhere" with 3 testimonial cards (glassmorphism), star ratings, names.

6. **Pricing** — "Simple, Transparent Pricing" with 2 cards (Standard and Premium). Premium highlighted with a "Popular" badge and border accent.

7. **FAQ** — 4 collapsible accordion items using the existing `Collapsible` component.

8. **Final CTA** — Dark purple gradient section with glow, heading, subtext, "Get Started Free" button.

9. **Footer** — Keep existing footer structure, update links to match spec.

## Technical Details

### Files Modified
1. **`src/pages/Landing.tsx`** — Full rewrite (~600-700 lines). Keep existing signup form logic and state. Add all new sections.
2. **`src/components/Layout/Header.tsx`** — Update Products dropdown items to use `href="#guest-list"`, `href="#tables-seating"`, etc. Update nav links.

### Design Implementation
- Rich purple gradient background maintained globally (already exists)
- Glassmorphism cards: `backdrop-filter: blur(10px)`, `background: rgba(255,255,255,0.1)`, `border: 1px solid rgba(255,255,255,0.2)`
- All text in white with opacity variants for hierarchy
- `rounded-2xl` (16px) on all cards, `rounded-3xl` (24px) on hero elements
- Large Apple-style spacing (`py-20`, `py-24`, `gap-16`)
- Hero video: HTML `<video>` tag with autoplay, muted, loop, playsInline, with dark overlay div on top
- Feature alternating: odd sections = image left/text right, even = text left/image right using `flex-row-reverse`
- FAQ: Use `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` from existing components
- Pricing cards: glassmorphism with Premium card having a purple border highlight

### New Icons Needed
- Import additional Lucide icons: `Music`, `Layout`, `Clock`, `CreditCard`, `ChevronDown` (already imported), `Play`

### No Backend Changes
- All existing signup logic preserved
- No database or Supabase changes
- No new dependencies needed

