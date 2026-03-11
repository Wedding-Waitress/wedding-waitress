

## Plan: Fix Interactive Drag/Resize/Rotate and Add 6-Point Handles

### Root Cause
The current `InteractiveTextOverlay` uses `setPointerCapture` on `e.target`, which can be a deeply nested child element. While pointer events should bubble, this approach is fragile and fails in practice. The fix is to use **document-level** `pointermove`/`pointerup` listeners when a drag starts, which is the reliable standard pattern.

### Changes

**1. Rewrite `InteractiveTextOverlay.tsx` pointer handling**

- On `pointerdown`, attach `document.addEventListener('pointermove', ...)` and `document.addEventListener('pointerup', ...)` instead of relying on React synthetic events and pointer capture on `e.target`
- Clean up listeners on pointer up
- This guarantees move/up events are received regardless of which child element was clicked

**2. Add 6 resize handles (instead of 2)**

Current: left-middle, right-middle only.
New layout with 6 handles:
```text
       ↻  (rotation)
       |
  ●────●────●   (top-left, top-center, top-right)
  │          │
  ●          ●   (middle-left, middle-right)  
  │          │
  ●────●────●   (bottom-left, bottom-center, bottom-right)
```
Actually per the user's screenshot (6 red arrows): **4 corners + 2 side midpoints** = 6 handles total, plus the rotation handle on top.

- Corner handles: resize both width and height (diagonal cursors: `nwse-resize`, `nesw-resize`)
- Side midpoint handles: resize width only (horizontal cursor: `ew-resize`)
- All handles are small squares (10x10px) with primary color

**3. Add vertical resize support**

- Current `onResize` only handles width. Extend to support height changes from corner/top/bottom handles
- Since invitation text zones don't have an explicit `height_percent`, corner drags will adjust `width_percent` and `y_percent` simultaneously (moving the zone vertically while resizing horizontally)
- Top-center and bottom-center handles will move `y_percent` (repositioning vertically)

### Files Changed
- `src/components/ui/InteractiveTextOverlay.tsx` — rewrite pointer handling to use document listeners; add 6 handles with corner + edge resize modes

