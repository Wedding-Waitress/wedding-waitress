

# Plan: Add Premium Pricing Section to Homepage

## Summary
Add a comprehensive pricing section between the "Everything you need" grid and the Testimonials section, featuring three main plan cards, a vendor plan row, and an RSVP bundles row. All pricing data sourced from the existing `stripePrices.ts` constants.

## What Changes

### Landing.tsx — Add Pricing Section (single file edit)

Insert a new `#pricing` section after the Extra Feature Grid (line 250) and before Testimonials (line 252). Three sub-sections:

**1. Main Plans (3 cards side-by-side)**
- Essential ($99, ~~$199~~, 100 guests), Premium ($149, ~~$299~~, 300 guests, highlighted with purple border + "Most Popular" badge + slightly larger), Unlimited ($249, ~~$499~~, unlimited guests)
- Each card: rounded-[20px], soft shadow, hover lift animation (`hover:-translate-y-2`), "Get Started" button triggering SignUpModal
- Note below: "All plans include a 7-day free trial (up to 20 guests). No risk. Upgrade anytime."

**2. Vendor Pro (single card, centered)**
- Title: "For Wedding Professionals"
- Card: Vendor Pro, $249/month, description + bullet points, "Start Subscription" button

**3. RSVP Bundles (horizontal cards/row)**
- Title: "Invite & RSVP Bundles"
- 4 simplified tier cards in a row: 100/$99, 300/$149, 500/$199, 1000/$299
- Note: "One-time payment per event"

**Design tokens used:**
- `rounded-[20px]`, `shadow-[0_4px_30px_rgba(0,0,0,0.08)]`
- Premium card: `border-2 border-primary`, `scale-105` on md+
- Hover: `hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]`
- Background matches existing `bg-white` section style
- Typography matches existing heading/body patterns

### No other files changed
- No new assets needed
- Pricing data hardcoded to match `stripePrices.ts` values
- Import `Check` icon from lucide-react for feature checkmarks

## Files Modified
1. `src/pages/Landing.tsx` — Insert pricing section JSX + add `Check` to icon imports

