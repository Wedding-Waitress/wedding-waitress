
## Goal
Make the footer's inner navigation grid stack on mobile and return to 3 columns at `sm:` breakpoint and above.

## Change
- **File:** `src/pages/Landing.tsx`
- **Edit:** Replace `grid grid-cols-3 gap-6` with `grid grid-cols-1 gap-6 sm:grid-cols-3` on the footer's inner navigation grid (Explore / Support / Legal columns).
- No other classes, markup, copy, or files touched.

## Out of scope
Header, hero, all other sections, footer brand block, footer bottom bar, copy, colors, spacing.

## Verification
1. Mobile (<640px): Explore, Support, Legal stack vertically.
2. ≥640px: three columns side-by-side, visually identical to current desktop.
3. No other section affected.
