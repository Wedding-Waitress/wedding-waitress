

## Fix Missing Guide Labels on Master Card

### Root Cause
The labels are rendered correctly in code (lines 436-453), but they're positioned at `left: -30mm` — outside the card boundary. The A4 page container on line 735 has `overflow-hidden`, which clips everything outside its edges, making the labels invisible.

### Solution
Instead of positioning labels outside the card with negative offsets, render them **inside** the card on the left edge. This avoids the clipping issue entirely.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

**Lines 436-453** — Reposition the guide labels overlay from `left: -30mm` (outside, clipped) to inside the card at `left: 2mm`, stacking labels vertically with arrows pointing right into the card content:

- Remove `left: '-30mm'` and `width: '28mm'`
- Set `left: '1mm'` so labels sit on the left interior edge of the master card
- Keep the same three positions: 25%, 50%, 75%
- Style labels with slightly more opaque backgrounds so they're readable over card content
- Keep `pointer-events-none` and `!isExporting` guard

### File modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` only

