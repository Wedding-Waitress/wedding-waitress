
## Goal
Increase footer link tap targets to ≥44px on mobile by adding vertical padding to the Explore / Support / Legal link `<a>` tags.

## Investigation needed
Locate the footer link blocks in `src/pages/Landing.tsx` and confirm the current `<a>` class strings so I add `block py-3` without conflicting with existing classes.

## Change
- **File:** `src/pages/Landing.tsx`
- **Edit:** On every `<a>` inside the three footer columns (Explore, Support, Legal), append `block py-3` to the existing className. No other classes, copy, hrefs, or markup touched.

## Why `py-3`
`py-3` = 12px top + 12px bottom + ~20px line-height ≈ 44px, hitting the WCAG/Apple HIG minimum. `py-2` would only reach ~36px.

## Out of scope
Footer brand block, bottom bar, copy, colors, link order, grid layout, any other section.

## Verification
1. Mobile (375px): each footer link is ≥44px tall and easy to tap; no visual overlap between links thanks to existing `gap-6` on the column.
2. Desktop: links remain visually grouped per column; spacing slightly more generous but layout unchanged structurally.
3. No translation keys or hrefs altered.
