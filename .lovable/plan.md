

# Plan: Premium One-Page Homepage for Wedding Waitress

## Summary
Complete redesign of `Landing.tsx` — replacing the current layout with a modern, Hitchd-inspired, image-driven marketing homepage. The existing Header component will be updated for the new navigation structure. All existing functionality (sign-up form logic, auth, routing) is preserved.

## What Changes

### 1. Replace Landing.tsx (~508 lines) — Full Rewrite
The entire page becomes a cinematic one-page marketing site with these sections in order:

**Hero Section** — Full-viewport video/image background with dark overlay, centered headline "Plan Your Wedding Without the Stress.", subheading, "Get Started Free" button, trust text. Uses a high-quality stock wedding image (from Unsplash or similar placeholder) as background since we can't embed actual video in Lovable easily — will use a looping CSS-animated gradient overlay to simulate cinematic feel.

**Feature Cards Row** — Title "The wedding platform your guests will love." with 6 vertical image cards (Guest List, Tables & Seating, QR Code Seating, Invitations, Running Sheet, Floor Plan) using glass overlay effect on background images.

**5 Alternating Feature Sections** — Large horizontal sections alternating image left/text right, then image right/text left. Each with background image, heading, description, and "Learn More" button. Covers: Guest List, Tables & Seating, QR Code Seating, Running Sheet, Invitations.

**Extra Feature Grid** — "Everything you need for your perfect day" with smaller cards: DJ & Music Planner, Dietary Requirements, Place Cards, Live Kiosk View, Seating Charts.

**Testimonial Section** — "Your friends will be impressed." with 6-8 review cards in a grid.

**Final CTA** — Emotional background with "All the magic. None of the stress." and Get Started Free button.

**Footer** — Logo + description left, Features/Pricing/FAQ center, social icons right, copyright with dynamic year, Terms & Privacy links.

### 2. Update Header.tsx — Navigation Restructure
- Keep the existing Header component structure
- Update desktop nav links: How It Works, Products (dropdown with scroll-to links), Pricing, FAQ, Contact
- Products dropdown items: Guest List, Tables & Seating, QR Code Seating, Running Sheet, Invitations & Cards
- Keep existing Sign In / Sign Up / Language selector on right
- Keep mobile hamburger menu

### 3. index.css — Add Homepage-Specific Styles
- Add utility classes for the hero overlay, glass card effects, alternating section layouts
- Add smooth scroll behavior
- Keep all existing styles untouched

### 4. Design Specifications
- Background: `#FAFAFA` (off-white)
- Large spacing between sections (py-24 to py-32)
- Border radius: `rounded-2xl` to `rounded-3xl` (16-24px)
- Soft shadows: `shadow-[0_4px_30px_rgba(0,0,0,0.08)]`
- Glass overlays: `bg-white/80 backdrop-blur-sm`
- Typography: existing Inter font, large headings (text-5xl to text-7xl)
- Images: Unsplash placeholder URLs for wedding imagery (will use `/lovable-uploads/` if available, otherwise placeholder gradients)
- All existing auth logic (SignUpModal, SignInModal) preserved

## What Does NOT Change
- No other pages modified
- No routing changes
- No database changes
- Dashboard, Guest Lookup, Kiosk — all untouched
- Existing CSS variables and design tokens preserved
- Sign-up form functionality stays the same (moves into SignUpModal trigger)

## Files Modified
1. `src/pages/Landing.tsx` — Full rewrite
2. `src/components/Layout/Header.tsx` — Nav link updates + Products dropdown scroll targets
3. `src/index.css` — Add homepage utility classes

## Technical Notes
- Video backgrounds: Will use high-quality static images with subtle CSS animation (parallax/zoom) to simulate cinematic feel, since embedding real video requires hosted video files
- Smooth scrolling: Add `scroll-behavior: smooth` to html
- Section IDs for dropdown navigation: `#guest-list`, `#tables-seating`, `#qr-seating`, `#running-sheet`, `#invitations`
- Copyright year: `new Date().getFullYear()` for auto-updating
- All images use placeholder wedding photos — user can replace with real assets later

