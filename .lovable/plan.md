
## Goal
Let hero CTA buttons feel slightly wider on larger phones (390–639px) by relaxing the `max-w-xs` cap.

## Investigation
Locate the hero CTA buttons in `src/pages/Landing.tsx` to confirm current classes (`w-full sm:w-auto max-w-xs sm:max-w-none` per the user's note) and that there are no other style conflicts.

## Change
- **File:** `src/pages/Landing.tsx`
- **Edit:** On the hero CTA buttons, replace `max-w-xs` with `max-w-sm`. Keep `w-full sm:w-auto` and `sm:max-w-none` intact. No other classes, copy, or markup touched.

## Why `max-w-sm` (not removal)
Removing the cap entirely lets buttons stretch edge-to-edge on phones, which looks heavy and pulls focus from the headline. `max-w-sm` (384px) gives breathing room on 390/414/430px phones while still capping growth. From `sm:` upward, `sm:max-w-none` already overrides, so desktop is unchanged.

## Out of scope
Stack direction, gap, padding, button variants, copy, translations, any other section.

## Verification
1. 375px: buttons unchanged in feel (still capped, stacked).
2. 390–430px: buttons noticeably wider, less awkward side padding, still not edge-to-edge.
3. ≥640px (`sm`): buttons inline, auto-width — visually identical to before.
