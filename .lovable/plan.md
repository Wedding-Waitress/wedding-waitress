

# Plan: Vendor Pro Card Update + Conversion Psychology Layer

## 1. Vendor Pro Card — Update bullet text (Landing.tsx lines 306-312)

Replace the 3-bullet feature list with 6 items:
- Unlimited events
- Unlimited guests
- Full platform access
- For wedding and event venues
- Wedding planners
- DJs, MCs and event professionals

Reduce text size to `text-xs` and spacing to `space-y-2` to keep it balanced and not crowded.

## 2. Conversion Psychology — Hero Section (Landing.tsx lines 116-122)

- Change hero CTA button text: update `hero.cta` in EN landing.json from "Get Started Free" to "Start Your Free Trial"
- Add trust line below button: "No credit card required. Start free in minutes." (new key `hero.trustLine`)

## 3. Conversion Psychology — Pricing Section

- Add reassurance line below trial note: "One simple plan. Full access. Choose by guest size only." (new key `pricing.reassurance`)
- Add "7-day free trial included" under each plan's Get Started button (new key `pricing.trialUnderButton`)
- Add "Best for most weddings" subtitle under Premium's "Most Popular" badge (new key `pricing.bestForMost`)
- Update Vendor Pro badge text from "For Professionals" to "For Venues & Pros" (update `pricing.forProfessionals`)

## 4. Conversion Psychology — Testimonials Section (Landing.tsx line 324)

Add intro line above testimonials title: "Used by couples to simplify guests, seating, RSVPs and event flow." (new key `testimonials.intro`)

## 5. Conversion Psychology — FAQ Questions (EN landing.json)

Replace current 6 FAQ items with conversion-focused questions:
1. "Do guests need an app?" → "No. Guests scan a QR code or click a link — no login, app, or download required."
2. "Can I send RSVP invites by email or SMS?" → "Yes! Send beautiful digital invitations and track RSVPs in real time."
3. "Can I manage seating charts and guest lists in one place?" → "Absolutely. Everything from guest management to seating charts is built into one platform."
4. "Is Wedding Waitress suitable for venues and planners too?" → "Yes. Our Vendor Pro plan is built for venues, planners, DJs, and event professionals."
5. "What happens after the 7-day free trial?" → "You can upgrade anytime. If you don't, your data stays safe and you can return later."
6. "Can I get a refund?" → "We offer a full refund within 14 days of purchase if you haven't exceeded the free trial limits."

## 6. Update all 13 locale files

Add the new keys (`hero.trustLine`, `hero.cta` update, `pricing.reassurance`, `pricing.trialUnderButton`, `pricing.bestForMost`, `pricing.forProfessionals` update, `pricing.features.forVenues`/`weddingPlanners`/`djMcPros`, `testimonials.intro`, updated FAQ items) to all 13 landing.json files with proper translations.

## Files Modified
1. `src/pages/Landing.tsx` — Vendor Pro bullets, trust line, reassurance line, trial-under-button, best-for-most, testimonials intro
2. `src/i18n/locales/[en,de,es,fr,it,nl,ja,ar,hi,vi,zh,tr,el]/landing.json` — All 13 locale files updated with new/changed keys

