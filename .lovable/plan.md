

# Plan: Above the Fold Conversion Optimisation

## Changes Overview

### 1. EN landing.json — Update copy
- `hero.title1`: "Plan Your Wedding" (keep)
- `hero.title2`: "Without the Stress." (keep)  
- `hero.title3`: "Seat Every Guest Perfectly — Instantly" (new line 2)
- `hero.subtitle`: "Manage your wedding guest list, seating chart, QR code seating, invitations and RSVPs — all in one simple, powerful platform designed for modern weddings."
- `hero.cta`: "Start Planning Free"
- `hero.trustLine`: "No credit card required"
- `hero.trustLine2`: "Sign up in 60 seconds"
- `hero.trusted`: "Trusted by couples across Australia"
- Add `hero.watchDemo`: "Watch Demo"
- Add `hero.scrollExplore`: "Scroll to explore"
- `pricing.subtitle`: "Choose the perfect plan for your wedding — start free and upgrade anytime."
- `faq.subtitle`: "Still have questions? We've got you covered."
- `finalCta.title1`: "Plan Your Wedding the Smart Way"
- `finalCta.title2`: "All the tools you need. None of the stress."
- `finalCta.cta`: "Start Planning Free"

### 2. All 12 other locale files — Same key updates with translations

### 3. Landing.tsx — UI changes

**Hero section (lines 124-144):**
- Change `hero.title3` line to use the new "Seat Every Guest Perfectly — Instantly" text (already uses `t()`)
- Add a secondary "Watch Demo" outline button next to the primary CTA — on click, smooth-scroll to `#guest-list` (first feature section)
- Reduce trust line font size from `text-lg sm:text-xl md:text-2xl` to `text-sm sm:text-base` for subtlety

**Scroll indicator (after hero, before feature cards):**
- Add a small animated down-arrow with "Scroll to explore" text centered, low opacity, with a CSS bounce animation

**Feature card images (line 159):**
- The images are already imported from `src/assets/` — if they appear grey, this is likely a loading/missing asset issue. Will verify the imports are correct and add `decoding="async"` for better loading. No structural change needed since all 13 images are already mapped.

**Pricing subtitle (line 230):**
- Already uses `t('pricing.subtitle')` — just updating the JSON value

**FAQ subtitle (line 387):**
- Already uses `t('faq.subtitle')` — just updating the JSON value

**Final CTA (lines 494-501):**
- Already uses `t()` keys — just updating JSON values
- Change button text via `finalCta.cta` key

## Files Modified
1. `src/pages/Landing.tsx` — Add Watch Demo button, scroll indicator, adjust trust text sizing
2. `src/i18n/locales/[en,de,es,fr,it,nl,ja,ar,hi,vi,zh,tr,el]/landing.json` — 13 files with updated copy

## Technical Details
- Watch Demo button: `<Button variant="outline" onClick={() => document.getElementById('guest-list')?.scrollIntoView({behavior:'smooth'})}>`
- Scroll indicator: `<div className="animate-bounce opacity-40">` with ChevronDown icon
- No layout or spacing changes beyond these additions

