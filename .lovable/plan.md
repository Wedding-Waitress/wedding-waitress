
## Goal
Ensure the Landing page footer link grid stacks on mobile and switches back to 3 columns from `sm` upward.

## What I found
In `src/pages/Landing.tsx`, the footer inner links grid is already set to:
```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
```
So the exact mobile-first fix you requested is already present in code.

## Plan
1. Treat this as a verification task rather than a new code change.
2. In implementation mode, confirm there is no second footer grid using `grid-cols-3` without a breakpoint.
3. Verify the preview at a mobile width (around 375px) to confirm Explore / Support / Legal stack vertically and links like “Cookie Policy” are not cramped.
4. If the preview still shows 3 cramped columns despite the code, investigate whether:
   - the preview is stale/cached, or
   - a different footer/component is being rendered than `src/pages/Landing.tsx`.

## Expected outcome
- Mobile: footer link groups stack vertically.
- `sm` and above: footer link groups display in 3 columns.
- No other footer styles or layout change.

## Technical note
This is a class-only responsive layout check on a locked public page, but it falls within the same safe bug-fix pattern already used in prior approved Landing page responsiveness adjustments.
