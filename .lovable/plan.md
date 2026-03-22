

## Fix Right-Edge Boundary Restriction on Master Card

### Root cause
`handleInteractiveMove` and `handleLiveGuestMove`/`handleLiveTableMove` apply no boundary clamping. The left/top/bottom edges appear restricted only as a CSS visual artifact (the `left: 0; width: 100%` layout naturally prevents leftward overflow, and `overflow: hidden` on the card container clips top/bottom). The right edge overflows because `paddingLeft` combined with `whiteSpace: nowrap` pushes text beyond the container's right boundary.

### Fix
**File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**

1. **Add offset clamping in `handleInteractiveMove`** (lines 203-227): After computing `newX` and `newY`, clamp the mm-based offsets so the resulting percentage position stays within 0-100%. The offset is relative to the anchor (50% for X, ~42%/62% for Y), so clamp `newX` to prevent `pos.x` from exceeding ~95% or going below ~5% (allowing some margin), and `newY` similarly.

   Concrete clamping math:
   - For X: `pos.x = ANCHOR_X + (offset / CARD_WIDTH_MM) * 100`. To keep `pos.x` in [5, 95]: offset must be in `[(5 - ANCHOR_X) * CARD_WIDTH_MM / 100, (95 - ANCHOR_X) * CARD_WIDTH_MM / 100]` = `[-47.25, 47.25]` mm.
   - For Y: similar bounds using `FRONT_HEIGHT_MM`.

   ```tsx
   const MAX_OFFSET_X_MM = 47; // keeps pos.x within ~5-95%
   const MAX_OFFSET_Y_MM = 20; // keeps pos.y within card bounds
   const clampedX = Math.max(-MAX_OFFSET_X_MM, Math.min(MAX_OFFSET_X_MM, newX));
   const clampedY = Math.max(-MAX_OFFSET_Y_MM, Math.min(MAX_OFFSET_Y_MM, newY));
   ```

2. **Add clamping in live move handlers** (lines 281-303): Clamp `dxPct` and `dyPct` draft values using the same percentage bounds so slave cards also respect boundaries during drag.

3. **Add `overflow: hidden`** to the front-half container of the master card to clip any remaining overflow visually, as a safety net.

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` only

### What stays untouched
- InteractiveTextOverlay internals (locked)
- buildAbsoluteStyle positioning math
- Persistence pipeline, master-slave architecture

