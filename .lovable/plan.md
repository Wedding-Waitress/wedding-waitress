

## Center Guest Name & Table/Seat Text on Place Cards

### What's wrong
The guest name and table/seat text use absolute positioning with anchor points at **30%** and **70%** of the front half (49.5mm). These anchor points don't account for the actual text height, so the pair appears visually off-center — pushed too high (guest name) and too low (table/seat) rather than being a neatly stacked, centered pair.

### What will change
Adjust the **default rendering** (when offsets are 0,0) so both text lines sit visually centered as a stacked pair on the front half. The locked interactive sync architecture (drag/move/rotate/resize, master-slave mirroring, committedOverrides, overlayKey re-keying) remains completely untouched.

### Plan

**File: `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx`**

1. **Adjust anchor points** — Move `GUEST_ANCHOR_Y` from 30 → **42** and `TABLE_ANCHOR_Y` from 70 → **62**. This places the two text lines closer together and vertically centered on the front half (~49.5mm). The 20-percentage-point gap becomes a tighter ~20pt gap that looks like consistent stacking. Horizontal anchors stay at 50%.

2. **Add a `name_spacing` gap** — The existing `currentSettings.name_spacing` (default 4) isn't currently used in the absolute positioning model. Use it to offset the two anchors symmetrically: guest name shifts up by `name_spacing/2` percent, table/seat shifts down by `name_spacing/2` percent from the center point. This gives consistent, controllable spacing between the two lines.

3. **No changes to**:
   - The interactive overlay system (InteractiveTextOverlay, drag, rotate, resize)
   - The master-slave sync (committedOverrides, draftOverrides, overlayKey)
   - The persistence pipeline (usePlaceCardSettings.ts, saveSeqRef)
   - The buildAbsoluteStyle function or transform logic

### Why this works
The absolute positioning with `translate(-50%, -50%)` already centers each element's bounding box at its anchor point. The problem is purely that 30%/70% are too far apart and not centered on the front half. Moving them to ~42%/62% (symmetrically around 52%, accounting for the fold line visual weight) centers the pair perfectly. The interactive drag system continues to work identically — it just starts from a better default position.

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardPreview.tsx` — anchor point constants only (2 lines)

