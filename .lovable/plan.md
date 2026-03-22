

## Fix Place Card Text Positioning and Boundary Detection

### Problem
Three issues with current implementation:
1. **Clamping prevents free movement** — `MAX_OFFSET_X_MM`, `MAX_OFFSET_Y_MM`, `MAX_DRAFT_PCT`, and `clampedY` restrict dragging, causing text to snap back or stop at edges instead of allowing free movement.
2. **`overflow: hidden` + `width: 95mm`** clips text and prevents accurate overflow detection — text is truncated with ellipsis instead of being visible and validated.
3. **Overflow detection uses container edge** instead of a 2-3mm inner safe margin.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`

**1. Remove all movement clamping (allow free drag in all directions)**

- `handleInteractiveMove` (lines 226-227, 235-236): Remove `Math.max(-MAX_OFFSET_X_MM, Math.min(...))` — just use the raw computed offset values.
- `handleLiveGuestMove` / `handleLiveTableMove` (lines 300-301, 314-315): Remove `MAX_DRAFT_PCT` clamping — pass raw `dxPct`/`dyPct` through.
- `buildAbsoluteStyle` (line 394): Remove `clampedY` — use `pos.y` directly for `top`.
- Remove the constants `MAX_OFFSET_X_MM`, `MAX_OFFSET_Y_MM`, `MAX_DRAFT_PCT` (lines 215-216, 297).

**2. Remove text clipping from `buildAbsoluteStyle` (lines 395-410)**

Remove `width: 95mm`, `maxWidth: 95mm`, `overflow: hidden`, `textOverflow: ellipsis`. Keep `left: 50%` centering, `whiteSpace: nowrap`, and `textAlign: center` but let text extend naturally so it remains visible and measurable.

**3. Update overflow detection with 2-3mm inner safe margin (lines 162-193)**

Instead of comparing text rects against the raw container bounds, inset the container rect by ~2.5mm (approximately `2.5 / 49.5 * containerHeight` pixels on each side) to create the safe zone. Any text element whose bounding box enters this margin triggers the red state.

```
Safe zone = containerRect inset by 2.5mm on all 4 sides
If elRect.left < safeLeft OR elRect.right > safeRight
   OR elRect.top < safeTop OR elRect.bottom > safeBottom
   → overflowing = true
```

The temporary `overflow: visible` trick stays so that `getBoundingClientRect()` returns the true unclipped extent.

**4. Remove `overflow: hidden` from the front-half container (line 539)**

Remove `overflow: 'hidden'` from the front-half div style so text remains visible when dragged outside the safe zone. The user sees it and can manually drag it back.

### What stays untouched
- InteractiveTextOverlay internals (locked)
- Master-slave sync architecture, committed/draft pipeline
- Green/red border styling, warning messages, pulse animation
- Back half layout, decorative image layout, print/export

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` only

