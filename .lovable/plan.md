
## Goal
Three targeted mobile fixes in `src/pages/Landing.tsx`. Items 1 and 2 are already done in prior turns — only item 3 needs work.

## Investigation
- **Item 1 (footer grid)**: Already updated to `grid-cols-2 gap-6 sm:grid-cols-3` per user's later instruction. User now asks for `grid-cols-1 sm:grid-cols-3`. Need to confirm whether to revert to `grid-cols-1` (this contradicts the most recent prior approval which set `grid-cols-2`).
- **Item 2 (Final CTA h2)**: Already updated to `text-3xl sm:text-5xl md:text-7xl`. No change needed.
- **Item 3 (Pricing scale overflow)**: Need to locate the Premium pricing card and either wrap its grid container in `overflow-x-hidden` or remove `lg:scale-105`.

## Changes
- **File:** `src/pages/Landing.tsx`
- **Edit A (footer):** Change the inner footer grid from `grid grid-cols-2 gap-6 sm:grid-cols-3` → `grid grid-cols-1 gap-6 sm:grid-cols-3`.
- **Edit B (Final CTA):** No-op — already at `text-3xl sm:text-5xl md:text-7xl`.
- **Edit C (Pricing):** Add `overflow-x-hidden` to the wrapper `div` of the pricing cards grid (the parent of the `grid` containing the Premium card with `lg:scale-105`). Keep `lg:scale-105` intact so the visual emphasis stays on desktop.

## Out of scope
Logic, copy, translation keys, other sections, other classes.

## Conflict to confirm
The user's prior approved instruction set the footer to `grid-cols-2` on mobile (so Explore/Support/Legal sit side-by-side as 2-up). This new instruction reverts it to `grid-cols-1` (full vertical stack). I will apply `grid-cols-1` as the most recent instruction wins — please flag if you'd rather keep `grid-cols-2`.

## Verification
1. Mobile (<640px): footer columns stack vertically; Final CTA fits without overflow.
2. Tablet (~768–1023px): pricing grid no longer triggers horizontal scroll from the scaled Premium card.
3. Desktop (≥1024px): Premium card still visually emphasized via `lg:scale-105`; layout unchanged.
4. No other section affected.
