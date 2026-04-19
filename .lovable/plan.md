
## Goal
Add top padding to Premium and Vendor Pro pricing cards so their `-top-4` badges aren't clipped on mobile.

## Investigation
Need to locate the Premium and Vendor Pro card divs in `src/pages/Landing.tsx` and check their current padding classes to merge `pt-6 lg:pt-8` correctly without conflicting with existing `p-*` utilities.

## Change
- **File:** `src/pages/Landing.tsx`
- **Edit:** On the Premium card div and the Vendor Pro card div, add `pt-6 lg:pt-8` (placed after any existing `p-*` shorthand so the top-padding override wins). No other classes touched.

## Out of scope
All other cards, badges, copy, logic, translations, other sections.

## Verification
1. Mobile (<640px): "Most Popular" and "For Venues & Pros" badges fully visible above the cards, not clipped.
2. Desktop (≥1024px): card spacing visually unchanged.
3. Other pricing cards (Essential, Unlimited, Vendor Basic) untouched.
