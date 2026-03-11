

## Plan: Canva/Photoshop-style Text Zone Editor

### What Changes

Rewrite `InteractiveTextOverlay.tsx` to deliver a professional editing experience:

**1. 8 resize handles** — 4 corners + top-middle + bottom-middle + left-middle + right-middle. Currently missing top-middle and bottom-middle.

**2. Rotation handle moves to bottom-right** — Remove the top circle+stem. Add a small curved-arrow icon handle offset from the bottom-right corner. Rotation angle calculated from element center to pointer position.

**3. Clean cursor behavior**
- Body: `move` cursor (not `grab` — feels more like Canva)
- Corners: `nwse-resize` / `nesw-resize`
- Side midpoints: `ew-resize`
- Top/bottom midpoints: `ns-resize`
- Rotation handle: custom rotate cursor (`alias`)

**4. Prevent text editing interference** — Add `user-select: none` and `pointer-events: none` on the text content div when selected, so dragging never triggers text selection.

**5. Top/bottom middle handles** — These adjust `y_percent` (vertical repositioning), matching how the corner vertical logic already works.

### Files Changed

| File | Change |
|------|--------|
| `src/components/ui/InteractiveTextOverlay.tsx` | Add top-middle + bottom-middle handles (8 total). Move rotation handle to bottom-right corner offset. Update cursors to `move`/resize/`alias`. Add `resize-top`/`resize-bottom` drag modes. |
| `src/components/Dashboard/Invitations/InvitationCardPreview.tsx` | Add handler for top/bottom resize modes (adjusts `y_percent`). No other changes needed — existing move/resize/corner/rotate handlers stay. |

### Handle Layout
```text
  ●────────●────────●
  │                 │
  ●                 ●
  │                 │
  ●────────●────────●
                      ↻  (rotation handle, offset from bottom-right)
```

### Technical Details

- New drag modes: `resize-top` and `resize-bottom` added to the union type
- Rotation handle: positioned at `right: -20px, bottom: -20px` with a `RotateCw` icon, `cursor: alias`
- The top stem + circle removed entirely
- `onResize` callback extended: side parameter becomes `'left' | 'right' | 'top' | 'bottom'`
- Top/bottom resize in preview: adjusts `y_percent` by `dyP`

